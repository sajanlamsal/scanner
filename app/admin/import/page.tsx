"use client";

import { useState, useRef } from "react";
import Link from "next/link";

interface ImportResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".csv")) setFile(dropped);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Import failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Import Tickets CSV</h1>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-5">
          {/* Expected format */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 font-mono">
            <p className="font-semibold mb-1 text-gray-700">Expected CSV columns:</p>
            <p>Attendee Name, Status, Active, Barcode, Event</p>
          </div>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file
                ? "border-green-400 bg-green-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div>
                <p className="text-green-700 font-semibold">{file.name}</p>
                <p className="text-green-600 text-sm mt-1">
                  {(file.size / 1024).toFixed(1)} KB — click to change
                </p>
              </div>
            ) : (
              <div className="text-gray-400">
                <p className="text-3xl mb-2">📂</p>
                <p className="font-medium">Drop CSV here or click to browse</p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-semibold text-green-800">
                Import complete ✓
              </p>
              <p className="text-sm text-green-700 mt-1">
                Inserted / updated: <strong>{result.inserted}</strong> &nbsp;·&nbsp;
                Skipped: <strong>{result.skipped}</strong>
              </p>
              {result.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-red-600 cursor-pointer">
                    {result.errors.length} row error(s)
                  </summary>
                  <ul className="mt-1 text-xs text-red-600 list-disc list-inside space-y-0.5">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? "Importing…" : "Import Tickets"}
          </button>
        </div>
      </div>
    </div>
  );
}
