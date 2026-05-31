import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { statsKey } from "@/lib/redis/keys";
import type { EventStats } from "@/types";

export async function GET() {
  const raw = await redis.hgetall(statsKey());
  const stats: EventStats = {
    total: raw?.total ? Number(raw.total) : 0,
    checkedIn: raw?.checkedIn ? Number(raw.checkedIn) : 0,
  };
  return NextResponse.json(stats);
}
