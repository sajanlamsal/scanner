#!/usr/bin/env tsx
/**
 * Seed the Neon DB from a CSV file and warm the Upstash Redis cache.
 *
 * Usage:
 *   npx tsx scripts/seed-csv.ts <path-to-csv>
 *
 * The CSV must have headers:
 *   Attendee Name, Status, Active, Barcode, Event
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env.local first, then fall back to .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import Papa from "papaparse";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { Redis } from "@upstash/redis";
import * as schema from "../lib/db/schema";
import { ticketKey, statsKey } from "../lib/redis/keys";
import type { CachedTicket } from "../types";

const rowSchema = z.object({
  "Attendee Name": z.string().min(1),
  Status: z.string(),
  Active: z.string(),
  Barcode: z.string().min(1),
  Event: z.string(),
});

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: npx tsx scripts/seed-csv.ts <path-to-csv>");
    process.exit(1);
  }

  const absolutePath = path.isAbsolute(csvPath)
    ? csvPath
    : path.resolve(process.cwd(), csvPath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  if (!process.env.NEON_DATABASE_URL) {
    console.error("NEON_DATABASE_URL is not set");
    process.exit(1);
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set");
    process.exit(1);
  }

  const sqlClient = neon(process.env.NEON_DATABASE_URL);
  const db = drizzle(sqlClient, { schema });
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const csvText = fs.readFileSync(absolutePath, "utf-8");
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    console.error("CSV parse errors:", parsed.errors);
    process.exit(1);
  }

  const rows = parsed.data;
  console.log(`Found ${rows.length} rows. Starting upsert…`);

  let inserted = 0;
  let skipped = 0;

  for (const raw of rows) {
    const result = rowSchema.safeParse(raw);
    if (!result.success) {
      console.warn(`Skipping invalid row:`, raw, result.error.flatten());
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
        .insert(schema.tickets)
        .values({
          attendeeName: row["Attendee Name"].trim(),
          status,
          active,
          barcode: row.Barcode.trim(),
          event: row.Event.trim(),
        })
        .onConflictDoUpdate({
          target: schema.tickets.barcode,
          set: {
            attendeeName: sql`excluded.attendee_name`,
            status: sql`excluded.status`,
            active: sql`excluded.active`,
            event: sql`excluded.event`,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Warm Redis
      const cached: CachedTicket = {
        id: upserted.id,
        attendeeName: upserted.attendeeName,
        status: upserted.status,
        active: upserted.active,
        checkedInAt: upserted.checkedInAt?.toISOString() ?? null,
      };
      await redis.set(ticketKey(row.Barcode.trim()), cached);

      inserted++;
      process.stdout.write(`\r  Inserted: ${inserted}  Skipped: ${skipped}`);
    } catch (err) {
      console.error(`\nFailed to upsert barcode ${row.Barcode}:`, err);
      skipped++;
    }
  }

  console.log(`\nUpsert complete — inserted/updated: ${inserted}, skipped: ${skipped}`);

  // Update stats in Redis
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.tickets);
  const [checkedInResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.tickets)
    .where(sql`status = 'checked_in'`);

  const total = totalResult?.count ?? 0;
  const checkedIn = checkedInResult?.count ?? 0;

  await redis.hset(statsKey(), { total, checkedIn });
  console.log(`Stats seeded — total: ${total}, checkedIn: ${checkedIn}`);
  console.log("Done ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
