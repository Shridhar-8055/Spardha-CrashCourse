"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) router.push("/admin");
      else setError(data.error ?? "Login failed.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade-up mx-auto max-w-md py-8">
      <div className="rounded-3xl border border-border bg-surface p-8">
        <h1 className="text-2xl font-bold">Admin login</h1>
        <p className="mt-1 text-sm text-muted">
          Enter the admin password to manage students.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">
              Admin password
            </span>
            <PasswordInput value={password} onChange={setPassword} autoFocus />

          </label>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-brand to-brand-2 px-4 py-3 font-semibold text-white shadow-lg shadow-brand/20 transition-transform hover:scale-[1.01] disabled:opacity-60"
          >
            {busy ? "Checking…" : "Log in as admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
