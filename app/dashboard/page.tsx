"use client";

import StatsCards from "@/components/dashboard/StatsCards";
import LiveFeed from "@/components/dashboard/LiveFeed";
import { useDashboard } from "@/hooks/useDashboard";
import Link from "next/link";
import { useState } from "react";

export default function DashboardPage() {
  const { stats, recents, connected } = useDashboard();
  const pct =
    stats.total > 0 ? ((stats.checkedIn / stats.total) * 100).toFixed(1) : "0";

  const [resetOpen, setResetOpen] = useState(false);
  const [resetSecret, setResetSecret] = useState("");
  const [deleteTickets, setDeleteTickets] = useState(false);
  const [resetState, setResetState] = useState<"idle" | "confirm" | "loading" | "done" | "error">("idle");
  const [resetMsg, setResetMsg] = useState("");

  async function handleReset() {
    if (resetState === "idle") { setResetState("confirm"); return; }
    if (resetState !== "confirm") return;
    if (!resetSecret.trim()) { setResetMsg("Enter the reset secret first."); return; }

    setResetState("loading");
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: {
          "x-reset-secret": resetSecret.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deleteTickets }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetMsg(data.message ?? "Reset failed.");
        setResetState("error");
      } else {
        setResetMsg(`Done — ${data.ticketCacheCleared} cache entries cleared.`);
        setResetState("done");
        setResetSecret("");
      }
    } catch {
      setResetMsg("Network error — reset failed.");
      setResetState("error");
    }
  }

  function cancelReset() {
    setResetState("idle");
    setResetMsg("");
    setResetSecret("");
    setDeleteTickets(false);
    setResetOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Event Dashboard</h1>
          <p className="text-xs text-gray-500">
            Real-time check-in stats
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-400"}`}
            />
            <span className="text-xs text-gray-500">
              {connected ? "Live" : "Reconnecting…"}
            </span>
          </div>
          <Link
            href="/scanner"
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Open Scanner
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{stats.checkedIn} checked in</span>
            <span>{pct}% of {stats.total}</span>
          </div>
          <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-700"
              style={{
                width: stats.total > 0 ? `${(stats.checkedIn / stats.total) * 100}%` : "0%",
              }}
            />
          </div>
        </div>

        {/* Stats cards */}
        <StatsCards stats={stats} />

        {/* Live feed */}
        <LiveFeed recents={recents} />

        {/* Danger Zone */}
        <div className="border border-red-200 rounded-xl overflow-hidden">
          <button
            onClick={() => { setResetOpen((v) => !v); setResetState("idle"); setResetMsg(""); }}
            className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 transition-colors text-left"
          >
            <span className="text-sm font-semibold text-red-700">Danger Zone</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16" height="16"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className={`text-red-400 transition-transform ${resetOpen ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {resetOpen && (
            <div className="px-4 py-4 bg-white flex flex-col gap-3">
              <p className="text-sm text-gray-600">
                <strong>Reset all data</strong> — marks every ticket as unchecked, clears scan logs and Redis cache. This cannot be undone.
              </p>

              {(resetState === "idle" || resetState === "confirm") && (
                <>
                  <input
                    type="password"
                    placeholder="Reset secret"
                    value={resetSecret}
                    onChange={(e) => setResetSecret(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={deleteTickets}
                      onChange={(e) => setDeleteTickets(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 accent-red-600 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">
                      Also delete all tickets
                      <span className="text-gray-400 ml-1">(allows reimport)</span>
                    </span>
                  </label>
                </>
              )}

              {resetMsg && (
                <p className={`text-sm font-medium ${resetState === "error" ? "text-red-600" : "text-green-600"}`}>
                  {resetMsg}
                </p>
              )}

              {resetState === "confirm" && (
                <p className="text-sm text-red-600 font-medium">
                  {deleteTickets
                    ? "⚠ All tickets AND check-in data will be permanently deleted."
                    : "⚠ Are you sure? All check-in data will be wiped."}
                </p>
              )}

              <div className="flex gap-2">
                {(resetState === "idle" || resetState === "confirm") && (
                  <>
                    <button
                      onClick={handleReset}
                      className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
                    >
                      {resetState === "confirm" ? "Yes, reset everything" : "Reset all data"}
                    </button>
                    <button
                      onClick={cancelReset}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {resetState === "loading" && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <svg className="animate-spin w-4 h-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Resetting…
                  </div>
                )}
                {(resetState === "done" || resetState === "error") && (
                  <button
                    onClick={cancelReset}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
