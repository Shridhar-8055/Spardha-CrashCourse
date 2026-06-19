"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const { login } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    const result = await login(name, userId, password);
    setBusy(false);
    if (result.ok) router.push("/");
    else setError(result.error ?? "Something went wrong.");
  };

  return (
    <div className="fade-up mx-auto max-w-md py-8">
      <div className="rounded-3xl border border-border bg-surface p-8">
        <h1 className="text-2xl font-bold">Student login</h1>
        <p className="mt-1 text-sm text-muted">
          Enter your name and the credentials your admin gave you.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field
            label="Your name"
            type="text"
            value={name}
            onChange={setName}
            placeholder="e.g. Ada Lovelace"
            autoFocus
          />
          <Field
            label="User ID"
            type="text"
            value={userId}
            onChange={setUserId}
            placeholder="Given by your admin"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Given by your admin"
          />

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-brand to-brand-2 px-4 py-3 font-semibold text-white shadow-lg shadow-brand/20 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Don&apos;t have credentials? Ask your course admin.
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Are you the admin?{" "}
        <Link href="/admin/login" className="text-brand hover:underline">
          Admin login
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {type === "password" ? (
        <PasswordInput
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-text outline-none transition-colors placeholder:text-muted/50 focus:border-brand"
        />
      )}
    </label>
  );
}
