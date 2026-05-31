import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { ticketKey, statsKey } from "@/lib/redis/keys";
import type { CachedTicket } from "@/types";
import Papa from "papaparse";
import { sql } from "drizzle-orm";

const rowSchema = z.object({
  "Attendee Name": z.string().min(1),
  Status: z.string(),
  Active: z.string(),
  Barcode: z.string().min(1),
  Event: z.string(),
});

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    return NextResponse.json(
      { message: "CSV parse error", errors: parsed.errors.slice(0, 5) },
      { status: 422 }
    );
  }

  const rows = parsed.data;
  const db = getDb();
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const raw of rows) {
    const result = rowSchema.safeParse(raw);
    if (!result.success) {
      errors.push(`Row skipped — invalid data: ${JSON.stringify(raw)}`);
      skipped++;
      continue;
    }

    const row = result.data;
    const active = row.Active.trim().toUpperCase() === "TRUE";
    const status =
      row.Status.trim().toLowerCase() === "checked_in"
        ? ("checked_in" as const)
        : ("registered" as const);

    try {
      const [upserted] = await db
        .insert(tickets)
        .values({
          attendeeName: row["Attendee Name"].trim(),
          status,
          active,
          barcode: row.Barcode.trim(),
          event: row.Event.trim(),
        })
        .onConflictDoUpdate({
          target: tickets.barcode,
          set: {
            attendeeName: sql`excluded.attendee_name`,
            status: sql`excluded.status`,
            active: sql`excluded.active`,
            event: sql`excluded.event`,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Warm Redis cache
      const cached: CachedTicket = {
        id: upserted.id,
        attendeeName: upserted.attendeeName,
        status: upserted.status,
        active: upserted.active,
        checkedInAt: upserted.checkedInAt?.toISOString() ?? null,
      };
      await redis.set(ticketKey(row.Barcode.trim()), cached);

      inserted++;
    } catch (err) {
      errors.push(`Failed to insert ${row.Barcode}: ${String(err)}`);
      skipped++;
    }
  }

  // Seed stats total count in Redis
  const [{ count: totalCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tickets);
  const [{ count: checkedInCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tickets)
    .where(sql`status = 'checked_in'`);

  await redis.hset(statsKey(), {
    total: totalCount,
    checkedIn: checkedInCount,
  });

  return NextResponse.json({
    inserted,
    skipped,
    errors: errors.slice(0, 20),
  });
}
