import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { tickets, scanLogs } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { statsKey, recentScansKey } from "@/lib/redis/keys";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-reset-secret");
  const expected = process.env.RESET_SECRET;

  if (!expected) {
    return NextResponse.json(
      { message: "RESET_SECRET is not configured" },
      { status: 503 }
    );
  }

  if (!secret || secret !== expected) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let deleteTickets = false;
  try {
    const body = await req.json();
    deleteTickets = body?.deleteTickets === true;
  } catch {
    // no body or not JSON — treat as false
  }

  const db = getDb();

  if (deleteTickets) {
    // Delete everything — scan logs first (no FK but good practice), then tickets
    await db.delete(scanLogs);
    await db.delete(tickets);
  } else {
    // Just reset check-in state
    await db.update(tickets).set({
      status: "registered",
      checkedInAt: null,
      updatedAt: new Date(),
    });
    await db.delete(scanLogs);
  }

  // Flush Redis — ticket cache, stats, recent scans
  const ticketKeys = await redis.keys("ticket_*");
  if (ticketKeys.length > 0) {
    await redis.del(...(ticketKeys as [string, ...string[]]));
  }
  await redis.del(statsKey(), recentScansKey());

  // Re-seed total so /api/stats stays correct — checkedIn resets to 0
  if (!deleteTickets) {
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tickets);
    await redis.hset(statsKey(), { total: totalCount, checkedIn: 0 });
  }

  return NextResponse.json({
    message: deleteTickets ? "All tickets deleted" : "Check-in data reset",
    ticketCacheCleared: ticketKeys.length,
  });
}
