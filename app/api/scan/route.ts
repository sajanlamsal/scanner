import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { tickets, scanLogs } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import {
  ticketKey,
  statsKey,
  recentScansKey,
  RECENT_SCANS_MAX,
} from "@/lib/redis/keys";
import type { CachedTicket, RecentScanEntry, ScanResponse } from "@/types";
import { isAuthenticated } from "@/lib/auth/pin";

const bodySchema = z.object({
  barcode: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "barcode is required" },
      { status: 400 }
    );
  }

  const { barcode } = parsed.data;
  const now = new Date().toISOString();

  // 1. Redis-first lookup
  let cached = await redis.get<CachedTicket>(ticketKey(barcode));

  if (!cached) {
    // 2. DB fallback
    const db = getDb();
    const [row] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.barcode, barcode))
      .limit(1);

    if (!row) {
      await logScan(barcode, "not_found", null);
      const resp: ScanResponse = { result: "not_found", message: "Ticket not found" };
      return NextResponse.json(resp, { status: 404 });
    }

    cached = {
      id: row.id,
      attendeeName: row.attendeeName,
      status: row.status,
      active: row.active,
      checkedInAt: row.checkedInAt?.toISOString() ?? null,
    };
    await redis.set(ticketKey(barcode), cached);
  }

  // 3. Inactive
  if (!cached.active) {
    await logScan(barcode, "inactive", cached.attendeeName);
    await pushRecentScan({ barcode, attendeeName: cached.attendeeName, result: "inactive", scannedAt: now });
    const resp: ScanResponse = {
      result: "inactive",
      attendeeName: cached.attendeeName,
      message: "Ticket is inactive",
    };
    return NextResponse.json(resp, { status: 403 });
  }

  // 4. Already checked in
  if (cached.status === "checked_in") {
    await logScan(barcode, "already_scanned", cached.attendeeName);
    await pushRecentScan({ barcode, attendeeName: cached.attendeeName, result: "already_scanned", scannedAt: now });
    const resp: ScanResponse = {
      result: "already_scanned",
      attendeeName: cached.attendeeName,
      checkedInAt: cached.checkedInAt ?? undefined,
      message: "Ticket already scanned",
    };
    return NextResponse.json(resp, { status: 409 });
  }

  // 5. Check in — update DB
  const [updated] = await getDb()
    .update(tickets)
    .set({
      status: "checked_in",
      checkedInAt: new Date(now),
      updatedAt: new Date(now),
    })
    .where(eq(tickets.barcode, barcode))
    .returning();

  if (!updated) {
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }

  // 6. Update Redis cache
  const updatedCached: CachedTicket = {
    ...cached,
    status: "checked_in",
    checkedInAt: now,
  };
  await redis.set(ticketKey(barcode), updatedCached);

  // 7. Increment stats + push recent scan (pipeline)
  await redis.hincrby(statsKey(), "checkedIn", 1);
  await pushRecentScan({ barcode, attendeeName: cached.attendeeName, result: "success", scannedAt: now });

  // 8. Audit log
  await logScan(barcode, "success", cached.attendeeName);

  const resp: ScanResponse = {
    result: "success",
    attendeeName: cached.attendeeName,
    checkedInAt: now,
    message: "Check-in successful",
  };
  return NextResponse.json(resp, { status: 200 });
}

async function pushRecentScan(entry: RecentScanEntry) {
  const pipeline = redis.pipeline();
  pipeline.lpush(recentScansKey(), JSON.stringify(entry));
  pipeline.ltrim(recentScansKey(), 0, RECENT_SCANS_MAX - 1);
  await pipeline.exec();
}

async function logScan(
  barcode: string,
  result: "success" | "already_scanned" | "not_found" | "inactive",
  attendeeName: string | null
) {
  await getDb().insert(scanLogs).values({ barcode, result, attendeeName });
}
