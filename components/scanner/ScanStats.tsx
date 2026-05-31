"use client";

import type { EventStats } from "@/types";

interface Props {
  stats: EventStats;
}

export default function ScanStats({ stats }: Props) {
  const pct =
    stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-black/60 backdrop-blur-sm text-white">
      <span className="text-sm font-medium">
        {stats.checkedIn}{" "}
        <span className="opacity-60">/ {stats.total} checked in</span>
      </span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-bold text-green-400">{pct}%</span>
      </div>
    </div>
  );
}
