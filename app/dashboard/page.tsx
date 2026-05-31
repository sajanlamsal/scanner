"use client";

import StatsCards from "@/components/dashboard/StatsCards";
import LiveFeed from "@/components/dashboard/LiveFeed";
import { useDashboard } from "@/hooks/useDashboard";
import Link from "next/link";

export default function DashboardPage() {
  const { stats, recents, connected } = useDashboard();
  const pct =
    stats.total > 0 ? ((stats.checkedIn / stats.total) * 100).toFixed(1) : "0";

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
      </main>
    </div>
  );
}
