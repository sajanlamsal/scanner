"use client";

import { useEffect } from "react";
import type { ScanResult } from "@/types";

interface Props {
  result: ScanResult;
  attendeeName: string | null;
  checkedInAt?: string;
  onDismiss: () => void;
}

const CONFIG: Record<
  ScanResult,
  { bg: string; icon: string; label: string; sub: string }
> = {
  success: {
    bg: "bg-green-500",
    icon: "✓",
    label: "Checked In!",
    sub: "",
  },
  already_scanned: {
    bg: "bg-amber-400",
    icon: "⚠",
    label: "Already Scanned",
    sub: "This ticket was already used",
  },
  not_found: {
    bg: "bg-red-500",
    icon: "✕",
    label: "Not Found",
    sub: "Ticket not found in system",
  },
  inactive: {
    bg: "bg-red-700",
    icon: "✕",
    label: "Inactive",
    sub: "This ticket is inactive",
  },
};

export default function ScanFeedback({
  result,
  attendeeName,
  checkedInAt,
  onDismiss,
}: Props) {
  const cfg = CONFIG[result];

  useEffect(() => {
    // Haptic feedback
    if ("vibrate" in navigator) {
      navigator.vibrate(result === "success" ? [100] : [50, 50, 50]);
    }

    const timer = setTimeout(onDismiss, 1800);
    return () => clearTimeout(timer);
  }, [result, onDismiss]);

  const isSuccess = result === "success";

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm select-none cursor-pointer"
      onClick={onDismiss}
      role="status"
      aria-live="polite"
    >
      {/* Glow orb */}
      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center mb-5 ${
          isSuccess
            ? "bg-green-500/10 shadow-[0_0_50px_rgba(74,222,128,0.25)]"
            : "bg-amber-500/10 shadow-[0_0_50px_rgba(251,191,36,0.25)]"
        }`}
      >
        <span
          className={`text-5xl font-bold ${
            isSuccess ? "text-green-400" : "text-amber-400"
          }`}
        >
          {cfg.icon}
        </span>
      </div>

      {/* Status label */}
      <p
        className={`text-[11px] uppercase tracking-widest font-semibold mb-2 ${
          isSuccess ? "text-green-400" : "text-amber-400"
        }`}
      >
        {cfg.label}
      </p>

      {/* Name */}
      {attendeeName && (
        <p className="text-xl font-semibold text-white text-center px-8 leading-snug">
          {attendeeName}
        </p>
      )}

      {/* Sub-label */}
      {cfg.sub && (
        <p className="text-sm text-zinc-500 mt-1 text-center px-8">{cfg.sub}</p>
      )}

      {/* Timestamp */}
      {checkedInAt && isSuccess && (
        <p className="text-[11px] text-zinc-600 mt-3 tabular-nums">
          {new Date(checkedInAt).toLocaleTimeString()}
        </p>
      )}

      <p className="text-[10px] text-zinc-700 mt-6 uppercase tracking-widest">
        Tap to dismiss
      </p>
    </div>
  );
}
