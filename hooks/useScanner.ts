"use client";

import { useState, useCallback, useRef } from "react";
import type { ScanResponse, RecentScanEntry, EventStats } from "@/types";

interface ScannerState {
  scanning: boolean;
  scanActive: boolean;
  scanMode: "tap" | "always";
  loading: boolean;
  overlay: ScanResponse | null;
  recentScans: RecentScanEntry[];
  stats: EventStats;
}

/** Cached result for a barcode — skips API call if same code re-scanned within TTL */
interface ScanMemory {
  barcode: string;
  result: ScanResponse;
  expiry: number;
}

/** How long (ms) to cache a scan result for the same barcode */
const SCAN_MEMORY_TTL = 8_000;

export function useScanner() {
  const [state, setState] = useState<ScannerState>({
    scanning: true,
    scanActive: false,
    scanMode: "tap",
    loading: false,
    overlay: null,
    recentScans: [],
    stats: { total: 0, checkedIn: 0 },
  });

  const processingRef = useRef(false);
  /** Per-barcode result cache — any previously seen barcode can skip the API call */
  const scanMemoryRef = useRef<Map<string, ScanMemory>>(new Map());

  const handleScan = useCallback(async (barcode: string) => {
    if (processingRef.current) return; // debounce — ignore while overlay visible
    processingRef.current = true;

    // ── Scan memory: instant replay, no API call ──────────────────────────
    const now = Date.now();
    const cached = scanMemoryRef.current.get(barcode);
    if (cached && now < cached.expiry) {
      const isBlocking = cached.result.result === "success";
      setState((s) => ({ ...s, overlay: cached.result }));
      if (!isBlocking) {
        processingRef.current = false;
      }
      return;
    }

    // Show spinner while waiting for API response
    setState((s) => ({ ...s, loading: true, scanActive: false }));

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });
      const data: ScanResponse = await res.json();

      // Only success is blocking (holds processingRef until dismissed)
      const isBlocking = data.result === "success";

      // Only add successful check-ins to the recent bar
      const entry: RecentScanEntry | null = isBlocking
        ? {
            barcode,
            attendeeName: data.attendeeName ?? null,
            result: data.result,
            scannedAt: new Date().toISOString(),
          }
        : null;

      // Cache result so any future re-scan of this barcode is instant
      scanMemoryRef.current.set(barcode, { barcode, result: data, expiry: now + SCAN_MEMORY_TTL });

      // Prune expired entries to prevent unbounded Map growth
      for (const [key, val] of scanMemoryRef.current) {
        if (now > val.expiry) scanMemoryRef.current.delete(key);
      }

      setState((s) => {
        const updatedStats =
          data.result === "success"
            ? { ...s.stats, checkedIn: s.stats.checkedIn + 1 }
            : s.stats;

        return {
          ...s,
          loading: false,
          scanActive: false,
          overlay: data,
          recentScans: entry
            ? [entry, ...s.recentScans].slice(0, 5)
            : s.recentScans,
          stats: updatedStats,
        };
      });

      // Non-blocking results auto-clear processingRef so the camera can scan again
      if (!isBlocking) {
        processingRef.current = false;
      }
    } catch {
      processingRef.current = false;
      setState((s) => ({
        ...s,
        loading: false,
        scanning: true,
        overlay: {
          result: "not_found",
          message: "Network error — try again",
        },
      }));
    }
  }, []);

  const dismissOverlay = useCallback(() => {
    processingRef.current = false;
    setState((s) => ({
      ...s,
      overlay: null,
      scanning: true,
      scanActive: s.scanMode === "always", // auto-resume in always-on mode
    }));
  }, []);

  const startScan = useCallback(() => {
    setState((s) => ({ ...s, scanActive: true }));
  }, []);

  const toggleScanMode = useCallback(() => {
    setState((s) => {
      const newMode = s.scanMode === "tap" ? "always" : "tap";
      return { ...s, scanMode: newMode, scanActive: newMode === "always" };
    });
  }, []);

  const setStats = useCallback((stats: EventStats) => {
    setState((s) => ({ ...s, stats }));
  }, []);

  return { state, handleScan, dismissOverlay, setStats, startScan, toggleScanMode };
}

