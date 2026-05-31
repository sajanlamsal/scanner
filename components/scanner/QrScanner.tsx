"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// Native W3C Shape Detection API — Chrome, Edge, Android WebView (NOT Safari iOS)
interface BarcodeDetectorResult { rawValue: string }
declare class BarcodeDetector {
  constructor(options: { formats: string[] });
  detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]>;
}

interface Props {
  onScan: (barcode: string) => void;
  active: boolean;
  loading?: boolean;
}

export default function QrScannerComponent({ onScan, active, loading = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const [cameraError, setCameraError] = useState<string | null>(null);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let rafId: number | null = null;

    const start = async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = String(err).toLowerCase();
        setCameraError(
          msg.includes("permission") || msg.includes("denied") || msg.includes("notallowed")
            ? "Camera permission denied. Allow camera access and reload."
            : "Camera failed to start — please reload."
        );
        return;
      }

      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

      const video = videoRef.current!;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // Autoplay blocked or srcObject cleared during cleanup
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      if ("BarcodeDetector" in window) {
        // ── Native path: Chrome, Android WebView, Edge (fast C++ decode) ──
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        const loop = async () => {
          if (cancelled) return;
          try {
            const [hit] = await detector.detect(video);
            if (hit?.rawValue) onScanRef.current(hit.rawValue.trim());
          } catch { /* frame not ready */ }
          if (!cancelled) rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      } else {
        // ── Canvas fallback: iOS Safari, Firefox (jsQR pure-JS decode) ──
        // Downsample to 480px — jsQR only needs to read the QR, not display it.
        // Full 1280×1280 = 1.64M pixels synchronously blocks the main thread on iPhone.
        const SCAN_SIZE = 480;
        const canvas = document.createElement("canvas");
        canvas.width = SCAN_SIZE;
        canvas.height = SCAN_SIZE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        const INTERVAL = 1000 / 25; // cap at 25fps
        let lastScan = 0;
        const loop = (ts: number) => {
          if (cancelled) return;
          rafId = requestAnimationFrame(loop);
          if (ts - lastScan < INTERVAL) return;
          lastScan = ts;
          if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;
          ctx.drawImage(video, 0, 0, SCAN_SIZE, SCAN_SIZE);
          const img = ctx.getImageData(0, 0, SCAN_SIZE, SCAN_SIZE);
          const code = jsQR(img.data, SCAN_SIZE, SCAN_SIZE);
          if (code?.data) onScanRef.current(code.data.trim());
        };
        rafId = requestAnimationFrame(loop);
      }
    };

    start();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      const video = videoRef.current;
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      }
    };
  }, [active]);

  return (
    <div className="relative w-full bg-black">
      <video ref={videoRef} className="w-full" playsInline muted autoPlay />

      {/* Loading spinner — shown while API call is in flight */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-green-400 animate-spin" />
          <span className="text-white/70 text-xs font-medium tracking-wide">Checking ticket…</span>
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

