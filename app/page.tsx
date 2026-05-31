"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/scanner";

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        // Hard redirect so the browser makes a fresh request with the new
        // session cookie — soft navigation (router.push) can race with the
        // cookie being committed before middleware re-checks it.
        window.location.href = redirect;
      } else {
        const data = await res.json();
        setError(data.message ?? "Incorrect PIN");
        setPin("");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎟️</div>
          <h1 className="text-2xl font-bold text-gray-900">Ticket Scanner</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your PIN to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError("");
            }}
            autoFocus
            className="w-full text-center text-2xl tracking-widest border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
            disabled={loading}
          />

          {error && (
            <p className="text-red-600 text-sm text-center font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-colors text-lg"
          >
            {loading ? "Checking…" : "Unlock"}
          </button>
        </form>

        <div className="mt-6 border-t pt-4 flex justify-center gap-4 text-sm">
          <a href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            Dashboard
          </a>
          <a href="/admin/import" className="text-gray-400 hover:text-gray-600 transition-colors">
            Import CSV
          </a>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
