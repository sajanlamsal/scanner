import { redis } from "@/lib/redis";
import {
  statsKey,
  recentScansKey,
  RECENT_SCANS_DISPLAY,
} from "@/lib/redis/keys";
import type { EventStats, RecentScanEntry } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastStatsJson = "";
      let lastRecentsJson = "";

      const sendEvent = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // Initial heartbeat
      sendEvent("connected", { ok: true });

      const poll = async () => {
        try {
          const [rawStats, rawRecents] = await Promise.all([
            redis.hgetall(statsKey()),
            redis.lrange(recentScansKey(), 0, RECENT_SCANS_DISPLAY - 1),
          ]);

          const stats: EventStats = {
            total: rawStats?.total ? Number(rawStats.total) : 0,
            checkedIn: rawStats?.checkedIn ? Number(rawStats.checkedIn) : 0,
          };

          const recents: RecentScanEntry[] = (rawRecents ?? []).map((item) =>
            typeof item === "string" ? JSON.parse(item) : item
          );

          const statsJson = JSON.stringify(stats);
          const recentsJson = JSON.stringify(recents);

          if (statsJson !== lastStatsJson) {
            lastStatsJson = statsJson;
            sendEvent("stats", stats);
          }

          if (recentsJson !== lastRecentsJson) {
            lastRecentsJson = recentsJson;
            sendEvent("recents", recents);
          }
        } catch {
          // Redis unavailable — skip this tick
        }
      };

      // Poll immediately then every 1.5 s
      await poll();
      const interval = setInterval(poll, 1500);

      // Heartbeat every 25 s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(interval);
          clearInterval(heartbeat);
        }
      }, 25000);

      // Clean up when client disconnects
      return () => {
        clearInterval(interval);
        clearInterval(heartbeat);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
