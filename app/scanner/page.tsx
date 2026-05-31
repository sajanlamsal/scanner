"use client";

import dynamic from "next/dynamic";
import ScanResultBanner from "@/components/scanner/ScanResultBanner";
import { useScanner } from "@/hooks/useScanner";
import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const QrScanner = dynamic(() => import("@/components/scanner/QrScanner"), {
  ssr: false,
  loading: () => (
    <div className="aspect-square w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm">
      Loading camera…
    </div>
  ),
});

export default function ScannerPage() {
  const { state, handleScan, dismissOverlay, startScan, toggleScanMode } = useScanner();
  const { checkedIn, total } = state.stats;
  const pct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
  const router = useRouter();

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }, [router]);

  // Prevent screen sleep on mobile during scanning
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    if ("wakeLock" in navigator) {
      (navigator.wakeLock as WakeLock)
        .request("screen")
        .then((wl) => { wakeLock = wl; })
        .catch(() => {});
    }
    return () => { wakeLock?.release(); };
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_40%_at_50%_-5%,rgba(74,222,128,0.07),transparent)]" />

      {/* ── Header ── */}
      <header className="relative z-20 sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-sm shadow-lg shadow-green-500/25">
            🎫
          </div>
          <div>
            <h1 className="font-semibold text-sm text-white leading-tight tracking-tight">
              Ticket Scanner
            </h1>
            <p className="text-[11px] text-zinc-500 leading-tight tabular-nums">
              {checkedIn} / {total} checked in
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1.5">
          <span className="font-bold text-sm tabular-nums text-green-400">{pct}%</span>
          <div className="w-14 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          onClick={logout}
          title="Log out"
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </header>

      <div className="relative max-w-sm mx-auto px-4 py-5 space-y-4">
        {/* ── Camera card ── */}
        <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/[0.08] shadow-2xl shadow-black/80">
          {/* top edge glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent z-10 pointer-events-none" />

          <QrScanner
            onScan={handleScan}
            active={state.scanning}
            scanActive={state.scanActive}
            loading={state.loading}
            busy={!!state.overlay}
            onActivate={startScan}
          />

        </div>

        {/* ── Scan mode toggle ── */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">Mode</span>
          <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-full p-0.5 gap-0.5">
            <button
              onClick={() => state.scanMode !== "tap" && toggleScanMode()}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                state.scanMode === "tap"
                  ? "bg-green-500 text-zinc-950 shadow-sm"
                  : "text-zinc-400"
              }`}
            >
              Tap
            </button>
            <button
              onClick={() => state.scanMode !== "always" && toggleScanMode()}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                state.scanMode === "always"
                  ? "bg-green-500 text-zinc-950 shadow-sm"
                  : "text-zinc-400"
              }`}
            >
              Always On
            </button>
          </div>
        </div>

        {/* ── Scan result banner ── */}
        {state.overlay && (
          <ScanResultBanner
            result={state.overlay.result}
            attendeeName={state.overlay.attendeeName ?? null}
            checkedInAt={state.overlay.checkedInAt}
            onDismiss={dismissOverlay}
          />
        )}
      </div>
    </main>
  );
}
