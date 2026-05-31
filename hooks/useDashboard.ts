"use client";

import { useEffect, useRef, useState } from "react";
import type { EventStats, RecentScanEntry } from "@/types";

interface DashboardState {
  stats: EventStats;
  recents: RecentScanEntry[];
  connected: boolean;
}

export function useDashboard(): DashboardState {
  const [state, setState] = useState<DashboardState>({
    stats: { total: 0, checkedIn: 0 },
    recents: [],
    connected: false,
  });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/sse/dashboard");
    esRef.current = es;

    es.addEventListener("connected", () => {
      setState((s) => ({ ...s, connected: true }));
    });

    es.addEventListener("stats", (e) => {
      setState((s) => ({ ...s, stats: JSON.parse(e.data) }));
    });

    es.addEventListener("recents", (e) => {
      setState((s) => ({ ...s, recents: JSON.parse(e.data) }));
    });

    es.onerror = () => {
      setState((s) => ({ ...s, connected: false }));
    };

    return () => {
      es.close();
    };
  }, []);

  return state;
}
