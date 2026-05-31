"use client";

import { useEffect } from "react";

interface Props {
  result: "not_found" | "inactive" | "already_scanned";
  attendeeName: string | null;
  onDismiss: () => void;
}

const CONFIG = {
  not_found: {
    icon: "✕",
    label: "Not Found",
    sub: "Ticket not in system",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
  },
  inactive: {
    icon: "⊘",
    label: "Inactive Ticket",
    sub: "This ticket has been deactivated",
    iconBg: "bg-zinc-700/50",
    iconColor: "text-zinc-400",
  },
  already_scanned: {
    icon: "⚠",
    label: "Already Scanned",
    sub: "This ticket was already used",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
  },
};

export default function ScanToast({ result, attendeeName, onDismiss }: Props) {
  const cfg = CONFIG[result];

  useEffect(() => {
    if ("vibrate" in navigator) navigator.vibrate([40, 30, 40]);
    const t = setTimeout(onDismiss, 2500);
    return () => clearTimeout(t);
  }, [result, onDismiss]);

  return (
    <div
      className="absolute bottom-0 inset-x-0 z-20 bg-zinc-900/95 backdrop-blur-md border-t border-white/[0.08] px-4 py-3 flex items-center gap-3 animate-[slideUp_0.15s_ease-out] cursor-pointer"
      onClick={onDismiss}
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}
      >
        <span className={`text-base font-bold ${cfg.iconColor}`}>{cfg.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-white leading-tight">{cfg.label}</p>
        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
          {attendeeName ?? cfg.sub}
        </p>
      </div>
      <span className="text-[10px] text-zinc-700 uppercase tracking-wide shrink-0">
        tap
      </span>
    </div>
  );
}
