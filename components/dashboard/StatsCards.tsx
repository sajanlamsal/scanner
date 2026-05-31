"use client";

import type { EventStats } from "@/types";

interface Props {
  stats: EventStats;
}

export default function StatsCards({ stats }: Props) {
  const pct =
    stats.total > 0 ? ((stats.checkedIn / stats.total) * 100).toFixed(1) : "0";
  const remaining = stats.total - stats.checkedIn;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard label="Total Tickets" value={stats.total} color="blue" />
      <StatCard label="Checked In" value={stats.checkedIn} color="green" />
      <StatCard label="Remaining" value={remaining} color="amber" />
      <StatCard label="Completion" value={`${pct}%`} color="purple" />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: "blue" | "green" | "amber" | "purple";
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };

  return (
    <div
      className={`rounded-xl border-2 p-4 flex flex-col gap-1 ${colors[color]}`}
    >
      <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
        {label}
      </span>
      <span className="text-3xl font-bold">{value}</span>
    </div>
  );
}
