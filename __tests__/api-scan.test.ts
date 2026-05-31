/**
 * Tests for the /api/scan route handler.
 *
 * Strategy: mock lib/db and lib/redis so no real network calls are made.
 * We test the full HTTP handler logic end-to-end through the Next.js
 * route function.
 */

import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisHincrby = jest.fn();
const mockPipelineExec = jest.fn().mockResolvedValue([]);
const mockPipelineLpush = jest.fn();
const mockPipelineLtrim = jest.fn();
const mockPipeline = jest.fn(() => ({
  lpush: mockPipelineLpush,
  ltrim: mockPipelineLtrim,
  exec: mockPipelineExec,
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
    hincrby: (...args: unknown[]) => mockRedisHincrby(...args),
    pipeline: () => mockPipeline(),
  },
}));

const mockDbSelect = jest.fn();
const mockDbUpdate = jest.fn();
const mockDbInsert = jest.fn();

// Chainable query builder mock
function makeSelectChain(result: unknown[]) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  };
  return chain;
}

function makeUpdateChain(result: unknown[]) {
  const chain = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(result),
  };
  return chain;
}

function makeInsertChain() {
  return {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockResolvedValue([]),
  };
}

jest.mock("@/lib/db", () => ({
  getDb: () => ({
    select: mockDbSelect,
    update: mockDbUpdate,
    insert: mockDbInsert,
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/scan", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    ({ POST } = await import("@/app/api/scan/route"));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default insert chain (for logScan)
    mockDbInsert.mockReturnValue(makeInsertChain());
  });

  it("returns 400 when body is missing barcode", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe("barcode is required");
  });

  it("returns 400 when body is invalid JSON structure", async () => {
    const req = new NextRequest("http://localhost/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when ticket is not in cache or DB", async () => {
    mockRedisGet.mockResolvedValue(null);
    const selectChain = makeSelectChain([]);
    mockDbSelect.mockReturnValue(selectChain);

    const res = await POST(makeRequest({ barcode: "0000000000" }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.result).toBe("not_found");
  });

  it("returns 403 when ticket is inactive (from cache)", async () => {
    mockRedisGet.mockResolvedValue({
      id: "uuid-1",
      attendeeName: "Test User",
      status: "registered",
      active: false,
      checkedInAt: null,
    });

    const res = await POST(makeRequest({ barcode: "10160198783572510097" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.result).toBe("inactive");
    expect(json.attendeeName).toBe("Test User");
  });

  it("returns 409 when ticket is already checked in (from cache)", async () => {
    mockRedisGet.mockResolvedValue({
      id: "uuid-1",
      attendeeName: "Gurung Anjala",
      status: "checked_in",
      active: true,
      checkedInAt: "2026-05-30T10:00:00.000Z",
    });

    const res = await POST(makeRequest({ barcode: "10160198783572510097" }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.result).toBe("already_scanned");
    expect(json.attendeeName).toBe("Gurung Anjala");
  });

  it("returns 200 and updates DB + Redis on successful check-in", async () => {
    // Cache miss → falls through to DB
    mockRedisGet.mockResolvedValue(null);

    const dbTicket = {
      id: "uuid-2",
      attendeeName: "Sunita pariyar",
      status: "registered",
      active: true,
      barcode: "10175227703451474126",
      event: "Sujan Chapagain",
      checkedInAt: null,
    };
    mockDbSelect.mockReturnValue(makeSelectChain([dbTicket]));

    const updatedTicket = { ...dbTicket, status: "checked_in", checkedInAt: new Date() };
    mockDbUpdate.mockReturnValue(makeUpdateChain([updatedTicket]));

    const res = await POST(makeRequest({ barcode: "10175227703451474126" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result).toBe("success");
    expect(json.attendeeName).toBe("Sunita pariyar");
    expect(json.checkedInAt).toBeTruthy();

    // Redis should be updated
    expect(mockRedisSet).toHaveBeenCalledWith(
      "ticket:10175227703451474126",
      expect.objectContaining({ status: "checked_in" })
    );
    // Stats incremented
    expect(mockRedisHincrby).toHaveBeenCalledWith("event:stats", "checkedIn", 1);
  });

  it("serves cached ticket on second scan (no DB call)", async () => {
    const cachedRegistered = {
      id: "uuid-3",
      attendeeName: "Amisha Magar",
      status: "registered",
      active: true,
      checkedInAt: null,
    };
    mockRedisGet.mockResolvedValue(cachedRegistered);

    const updatedTicket = { ...cachedRegistered, status: "checked_in", checkedInAt: new Date() };
    mockDbUpdate.mockReturnValue(makeUpdateChain([updatedTicket]));

    const res = await POST(makeRequest({ barcode: "10442004280311171333" }));
    expect(res.status).toBe(200);

    // DB select should NOT have been called
    expect(mockDbSelect).not.toHaveBeenCalled();
  });
});
