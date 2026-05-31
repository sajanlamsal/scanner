"use client";

import { useEffect } from "react";
import type { ScanResult } from "@/types";

function playFeedback(type: "success" | "error") {
  // Physical vibration on Android
  if ("vibrate" in navigator) {
    navigator.vibrate(type === "success" ? [100] : [40, 30, 40]);
  }
  // Tone feedback on iOS (and as supplement on Android)
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    }

    osc.onended = () => ctx.close();
  } catch {
    // AudioContext not available — silently skip
  }
}

interface Props {
  result: ScanResult;
  attendeeName: string | null;
  checkedInAt?: string;
  onDismiss: () => void;
}

const CONFIG: Record<
  ScanResult,
  {
    icon: string;
    label: string;
    fallback: string; // shown when no attendeeName
    iconBg: string;
    iconColor: string;
    border: string;
    bg: string;
    glow: string;
  }
> = {
  success: {
    icon: "✓",
    label: "Checked In!",
    fallback: "Welcome!",
    iconBg: "bg-green-500/20",
    iconColor: "text-green-400",
    border: "border-green-500/30",
    bg: "bg-green-500/[0.06]",
    glow: "shadow-[0_0_20px_rgba(74,222,128,0.12)]",
  },
  not_found: {
    icon: "✕",
    label: "Not Found",
    fallback: "Ticket not in system",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
    border: "border-red-500/25",
    bg: "bg-red-500/[0.05]",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.08)]",
  },
  inactive: {
    icon: "⊘",
    label: "Inactive Ticket",
    fallback: "This ticket has been deactivated",
    iconBg: "bg-zinc-700/50",
    iconColor: "text-zinc-400",
    border: "border-zinc-600/30",
    bg: "bg-zinc-800/40",
    glow: "",
  },
  already_scanned: {
    icon: "⚠",
    label: "Already Scanned",
    fallback: "This ticket was already used",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    border: "border-amber-500/25",
    bg: "bg-amber-500/[0.05]",
    glow: "shadow-[0_0_20px_rgba(251,191,36,0.08)]",
  },
};

export default function ScanResultBanner({
  result,
  attendeeName,
  checkedInAt,
  onDismiss,
}: Props) {
  const cfg = CONFIG[result];

  useEffect(() => {
    playFeedback(result === "success" ? "success" : "error");
    const duration = result === "success" ? 1800 : 2500;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [result, onDismiss]);

  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 flex items-center gap-3 cursor-pointer animate-[slideUp_0.2s_ease-out] ${cfg.bg} ${cfg.border} ${cfg.glow}`}
      onClick={onDismiss}
      role="status"
      aria-live="polite"
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}
      >
        <span className={`text-xl font-bold ${cfg.iconColor}`}>{cfg.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm leading-tight ${cfg.iconColor}`}>
          {cfg.label}
        </p>
        {attendeeName ? (
          <p className="text-[13px] text-white font-medium mt-1 leading-snug break-words">
            {attendeeName}
          </p>
        ) : (
          <p className="text-[12px] text-zinc-400 mt-0.5">{cfg.fallback}</p>
        )}
        {checkedInAt && result === "already_scanned" && (
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Scanned at{" "}
            {new Date(checkedInAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
      <span className="text-[10px] text-zinc-600 uppercase tracking-wide shrink-0">
        tap
      </span>
    </div>
  );
}
