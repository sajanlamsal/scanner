"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

interface Props {
  onScan: (barcode: string) => void;
  active: boolean;
}

const SCANNER_ELEMENT_ID = "qr-scan-region";

function clearContainer() {
  const el = document.getElementById(SCANNER_ELEMENT_ID);
  if (el) el.innerHTML = "";
}

export default function QrScanner({ onScan, active }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const [cameraError, setCameraError] = useState<string | null>(null);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) {
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

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: { ideal: "environment" } },
          {
            fps: 10,
            aspectRatio: 1.0,
            qrbox: (w: number, h: number) => {
              const edge = Math.round(Math.min(w, h) * 0.75);
              return { width: edge, height: edge };
            },
            videoConstraints: {
              facingMode: { ideal: "environment" },
              width: { ideal: 640 },
              height: { ideal: 640 },
            },
          },
          (decodedText) => {
            onScanRef.current(decodedText.trim());
          },
          () => { /* NotFoundException per frame — silent */ }
        );
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
        scanner.stop().catch(() => {});
        scannerRef.current = null;
        clearContainer();
      }
    };

    run();

    return () => {
      isCancelled = true;
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

