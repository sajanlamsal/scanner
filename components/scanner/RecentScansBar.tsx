"use client";

import type { RecentScanEntry } from "@/types";

const PILL_STYLES: Record<string, string> = {
  success:
    "bg-green-500/10 border border-green-500/20 text-green-400",
  already_scanned:
    "bg-amber-500/10 border border-amber-500/20 text-amber-400",
};

const ICONS: Record<string, string> = {
  success: "✓",
  already_scanned: "⚠",
};

interface Props {
  scans: RecentScanEntry[];
}

export default function RecentScansBar({ scans }: Props) {
  if (scans.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium px-0.5">
        Recent check-ins
      </p>
      <div className="flex gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
        {scans.map((s, i) => (
          <div
            key={`${s.barcode}-${s.scannedAt}-${i}`}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              PILL_STYLES[s.result] ?? "bg-white/5 border border-white/10 text-zinc-400"
            }`}
          >
            <span className="text-[10px]">{ICONS[s.result] ?? "·"}</span>
            <span className="max-w-[110px] truncate">
              {s.attendeeName ?? s.barcode}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
