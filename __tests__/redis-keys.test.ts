import { ticketKey, statsKey, recentScansKey, RECENT_SCANS_MAX } from "@/lib/redis/keys";

describe("Redis key helpers", () => {
  it("ticketKey returns correct key for a barcode", () => {
    expect(ticketKey("10160198783572510097")).toBe("ticket:10160198783572510097");
  });

  it("ticketKey handles barcodes with special characters", () => {
    expect(ticketKey("abc-123_xyz")).toBe("ticket:abc-123_xyz");
  });

  it("statsKey returns event:stats", () => {
    expect(statsKey()).toBe("event:stats");
  });

  it("recentScansKey returns recent_scans", () => {
    expect(recentScansKey()).toBe("recent_scans");
  });

  it("RECENT_SCANS_MAX is 50", () => {
    expect(RECENT_SCANS_MAX).toBe(50);
  });
});
