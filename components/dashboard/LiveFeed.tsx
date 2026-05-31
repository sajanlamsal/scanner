"use client";

import type { RecentScanEntry } from "@/types";

interface Props {
  recents: RecentScanEntry[];
}

const RESULT_STYLE: Record<
  string,
  { bg: string; text: string; icon: string; label: string }
> = {
  success: { bg: "bg-green-100", text: "text-green-800", icon: "✓", label: "Checked In" },
  already_scanned: { bg: "bg-amber-100", text: "text-amber-800", icon: "⚠", label: "Duplicate" },
  not_found: { bg: "bg-red-100", text: "text-red-800", icon: "✕", label: "Not Found" },
  inactive: { bg: "bg-red-200", text: "text-red-900", icon: "✕", label: "Inactive" },
};

export default function LiveFeed({ recents }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
        Live Scan Feed
      </h2>
      {recents.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">
          Waiting for scans…
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recents.map((scan, i) => {
            const style = RESULT_STYLE[scan.result];
            return (
              <li
                key={`${scan.barcode}-${scan.scannedAt}-${i}`}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 ${style.bg}`}
              >
                <span className={`font-bold text-lg w-6 text-center ${style.text}`}>
                  {style.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${style.text}`}>
                    {scan.attendeeName ?? scan.barcode}
                  </p>
                  <p className={`text-xs opacity-70 ${style.text}`}>
                    {scan.barcode}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text} border border-current border-opacity-20`}
                  >
                    {style.label}
                  </span>
                  <p className={`text-xs mt-1 opacity-60 ${style.text}`}>
                    {new Date(scan.scannedAt).toLocaleTimeString()}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
