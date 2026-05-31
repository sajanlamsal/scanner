"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface Props {
  onScan: (barcode: string) => void;
  active: boolean;
  scanActive: boolean;
  loading?: boolean;
  busy?: boolean; // suppresses tap overlay while result banner is showing
  onActivate: () => void;
}

const SCANNER_ELEMENT_ID = "qr-scan-region";

// Formats to detect — QR codes + common event ticket barcodes
const FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

function clearContainer() {
  const el = document.getElementById(SCANNER_ELEMENT_ID);
  if (el) el.innerHTML = "";
}

export default function QrScanner({ onScan, active, scanActive, loading = false, busy = false, onActivate }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const scanActiveRef = useRef(scanActive);
  const startedRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  onScanRef.current = onScan;
  scanActiveRef.current = scanActive;

  // Toggle pause / resume when scanActive changes — no camera restart needed
  useEffect(() => {
    const s = scannerRef.current;
    if (!s || !startedRef.current) return;
    try {
      const st = s.getState();
      if (scanActive && st === Html5QrcodeScannerState.PAUSED) {
        s.resume();
      } else if (!scanActive && st === Html5QrcodeScannerState.SCANNING) {
        s.pause(false); // keep video stream, pause detection
      }
    } catch { /* ignore */ }
  }, [scanActive]);

  useEffect(() => {
    if (!active) {
      startedRef.current = false;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        try {
          const st = s.getState();
          if (
            st === Html5QrcodeScannerState.SCANNING ||
            st === Html5QrcodeScannerState.PAUSED
          ) {
            s.stop().catch(() => {});
          }
        } catch { /* already stopped */ }
      }
      clearContainer();
      return;
    }

    let isCancelled = false;

    const run = async () => {
      // 100ms delay: gives React StrictMode's synchronous cleanup time to fire
      // and set isCancelled=true before we touch the DOM
      await new Promise<void>((r) => setTimeout(r, 100));
      if (isCancelled) return;

      clearContainer();
      setCameraError(null);

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        verbose: false,
        formatsToSupport: FORMATS,
      });
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: { ideal: "environment" } },
          {
            fps: 15,
            aspectRatio: 1.0,
            qrbox: (w: number, h: number) => {
              const edge = Math.round(Math.min(w, h) * 0.90);
              return { width: edge, height: edge };
            },
            videoConstraints: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 1280 },
            },
          },
          (decodedText) => {
            onScanRef.current(decodedText.trim());
          },
          () => { /* NotFoundException per frame — silent */ }
        );
        startedRef.current = true;
        // Always start paused — user must tap to initiate each scan
        if (!scanActiveRef.current) {
          try { scanner.pause(false); } catch { /* ignore */ }
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        scannerRef.current = null;
        const msg = String(err).toLowerCase();
        setCameraError(
          msg.includes("permission") ||
          msg.includes("notallowed") ||
          msg.includes("denied")
            ? "Camera permission denied. Allow camera access and reload."
            : "Camera failed to start — please reload."
        );
        return;
      }

      if (isCancelled) {
        startedRef.current = false;
        scanner.stop().catch(() => {});
        scannerRef.current = null;
        clearContainer();
      }
    };

    run();

    return () => {
      isCancelled = true;
      startedRef.current = false;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        try {
          const st = s.getState();
          if (
            st === Html5QrcodeScannerState.SCANNING ||
            st === Html5QrcodeScannerState.PAUSED
          ) {
            s.stop().catch(() => {});
          }
        } catch { /* already stopped */ }
      }
      clearContainer();
    };
  }, [active]);

  return (
    <div className="relative w-full bg-black">
      <div id={SCANNER_ELEMENT_ID} className="w-full" />

      {/* Loading spinner — shown while API call is in flight */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-green-400 animate-spin" />
          <span className="text-white/70 text-xs font-medium tracking-wide">Checking ticket…</span>
        </div>
      )}

      {/* Tap-to-scan overlay — shown when camera is ready but not actively scanning */}
      {!cameraError && !scanActive && !loading && !busy && (
        <button
          onClick={onActivate}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/50 active:bg-black/30 transition-colors"
          aria-label="Tap to scan"
        >
          <div className="w-16 h-16 rounded-full border-2 border-white/40 bg-white/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-base tracking-wide">Tap to scan</span>
          <span className="text-white/50 text-xs">QR code or barcode</span>
        </button>
      )}

      {/* Scanning active indicator */}
      {!cameraError && scanActive && (
        <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none z-10">
          <span className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 text-green-400 text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Scanning…
          </span>
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-black/90 min-h-[200px]">
          <div className="text-4xl">📷</div>
          <p className="text-red-400 font-medium">{cameraError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white text-black rounded-lg font-medium text-sm"
          >
            Reload
          </button>
        </div>
      )}
    </div>
  );
}

