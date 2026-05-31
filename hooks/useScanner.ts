"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ScanResponse, EventStats } from "@/types";

interface ScannerState {
  scanning: boolean;
  scanActive: boolean;
  loading: boolean;
  overlay: ScanResponse | null;
  stats: EventStats;
}

/** Short-TTL cache for non-checked-in results (not_found, inactive) */
interface ScanMemory {
  barcode: string;
  result: ScanResponse;
  expiry: number;
}

/** How long (ms) to cache not_found / inactive results */
const SCAN_MEMORY_TTL = 8_000;

export function useScanner() {
  const [state, setState] = useState<ScannerState>({
    scanning: true,
    scanActive: true,
    loading: false,
    overlay: null,
    stats: { total: 0, checkedIn: 0 },
  });

  const processingRef = useRef(false);
  /** Permanent session set — barcodes confirmed checked-in (server or local) */
  const checkedInSetRef = useRef<Set<string>>(new Set());
  /** Short-TTL cache for non-success results (not_found, inactive) */
  const scanMemoryRef = useRef<Map<string, ScanMemory>>(new Map());

  const handleScan = useCallback(async (barcode: string) => {
    if (processingRef.current) return; // debounce — ignore while overlay visible
    processingRef.current = true;

    // ── 1. Already checked-in this session → instant already_scanned, no API ──
    if (checkedInSetRef.current.has(barcode)) {
      const alreadyResp: ScanResponse = {
        result: "already_scanned",
        message: "Ticket already scanned",
      };
      setState((s) => ({ ...s, overlay: alreadyResp }));
      processingRef.current = false;
      return;
    }

    // ── 2. Short-TTL cache for other results (not_found, inactive) ────────
    const now = Date.now();
    const cached = scanMemoryRef.current.get(barcode);
    if (cached && now < cached.expiry) {
      setState((s) => ({ ...s, overlay: cached.result }));
      processingRef.current = false;
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

      // Mark as checked-in locally for success or already_scanned
      if (data.result === "success" || data.result === "already_scanned") {
        checkedInSetRef.current.add(barcode);
      }

      // Cache non-success/non-already_scanned results with TTL
      if (data.result !== "success" && data.result !== "already_scanned") {
        scanMemoryRef.current.set(barcode, { barcode, result: data, expiry: now + SCAN_MEMORY_TTL });
        for (const [key, val] of scanMemoryRef.current) {
          if (now > val.expiry) scanMemoryRef.current.delete(key);
        }
      }

      // Only success is blocking (holds processingRef until dismissed)
      const isBlocking = data.result === "success";

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
          stats: updatedStats,
        };
      });

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
      scanActive: true,
    }));
  }, []);

  const startScan = useCallback(() => {
    setState((s) => ({ ...s, scanActive: true }));
  }, []);

  const setStats = useCallback((stats: EventStats) => {
    setState((s) => ({ ...s, stats }));
  }, []);

  // Fetch real stats on mount
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setState((s) => ({ ...s, stats: data })))
      .catch(() => {});
  }, []);

  return { state, handleScan, dismissOverlay, setStats, startScan };
}

