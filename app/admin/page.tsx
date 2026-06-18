"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface AdminStudent {
  userId: string;
  password: string;
  name: string;
  status: string;
  lastLoginAt: string;
  lastDevice: string;
  loginCount: number;
  completedLessons: number;
  online: boolean;
  createdAt: string;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminDashboard() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [customId, setCustomId] = useState("");
  const [customPw, setCustomPw] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] =
    useState<{ userId: string; password: string } | null>(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/students", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Could not load students.");
      else setStudents(data.students ?? []);
    } catch {
      setError("Network error loading students.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Verify admin session, then load.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store" });
        const data = await res.json();
        if (!data.admin) {
          router.replace("/admin/login");
          return;
        }
        setAuthed(true);
        loadStudents();
      } catch {
        router.replace("/admin/login");
      }
    })();
  }, [router, loadStudents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setError(null);
    setJustCreated(null);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          userId: customId.trim() || undefined,
          password: customPw.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Could not create student.");
      else {
        setJustCreated(data.student);
        setName("");
        setCustomId("");
        setCustomPw("");
        await loadStudents();
      }
    } catch {
      setError("Network error creating student.");
    } finally {
      setCreating(false);
    }
  };

  const action = async (
    userId: string,
    act: "reset" | "delete" | "disable" | "enable",
    confirmMsg?: string
  ) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      const res = await fetch("/api/admin/students/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: act }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Action failed.");
      else await loadStudents();
    } catch {
      setError("Network error.");
    }
  };

  const handleAdminLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (authed === null) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-muted">
        Checking admin session…
      </div>
    );
  }

  const onlineCount = students.filter((s) => s.online).length;

  return (
    <div className="fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Admin dashboard
          </h1>
          <p className="mt-1 text-muted">Issue credentials and manage students.</p>
        </div>
        <button
          onClick={handleAdminLogout}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-text"
        >
          Log out
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Students" value={`${students.length} / 50`} />
        <Stat label="Logged in now" value={`${onlineCount}`} />
        <Stat
          label="Disabled"
          value={`${students.filter((s) => s.status === "disabled").length}`}
        />
        <Stat
          label="Videos watched (total)"
          value={`${students.reduce((sum, s) => sum + s.completedLessons, 0)}`}
        />
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Create student */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-bold">Add a student</h2>
        <p className="mt-1 text-sm text-muted">
          Leave User ID / Password blank to auto-generate them. Name is optional
          (students also type their name at login).
        </p>
        <form
          onSubmit={handleCreate}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
          <input
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            placeholder="User ID (optional)"
            className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
          <input
            value={customPw}
            onChange={(e) => setCustomPw(e.target.value)}
            placeholder="Password (optional)"
            className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={creating || students.length >= 50}
            className="rounded-xl bg-gradient-to-r from-brand to-brand-2 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {creating ? "Adding…" : "Add student"}
          </button>
        </form>

        {justCreated && (
          <div className="mt-4 rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm">
            ✅ Created! Share these credentials with the student:
            <div className="mt-2 flex flex-wrap gap-4 font-mono">
              <span>
                <span className="text-muted">User ID:</span>{" "}
                <strong>{justCreated.userId}</strong>
              </span>
              <span>
                <span className="text-muted">Password:</span>{" "}
                <strong>{justCreated.password}</strong>
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Student table */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Students</h2>
          <button
            onClick={loadStudents}
            className="text-sm text-muted hover:text-text"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
            Loading students…
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-muted">
            No students yet. Add one above to get started.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3">Password</th>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Watched</th>
                  <th className="px-4 py-3">Last login</th>
                  <th className="px-4 py-3">Logins</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s) => (
                  <tr
                    key={s.userId}
                    className={s.status === "disabled" ? "opacity-50" : ""}
                  >
                    <td className="px-4 py-3">{s.name || "—"}</td>
                    <td className="px-4 py-3 font-mono">{s.userId}</td>
                    <td className="px-4 py-3 font-mono">{s.password}</td>
                    <td className="px-4 py-3">
                      {s.status === "disabled" ? (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                          disabled
                        </span>
                      ) : s.online ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          on a device
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                          free
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {s.completedLessons} videos
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(s.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3 text-muted">{s.loginCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() =>
                            action(
                              s.userId,
                              "reset",
                              `Reset ${s.userId}'s session? This logs them out and lets them sign in on a new device.`
                            )
                          }
                          disabled={!s.online}
                          title="Force logout / unlock device"
                          className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:text-text disabled:opacity-40"
                        >
                          Reset
                        </button>
                        {s.status === "disabled" ? (
                          <button
                            onClick={() => action(s.userId, "enable")}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs text-emerald-300 hover:bg-surface-2"
                          >
                            Enable
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              action(
                                s.userId,
                                "disable",
                                `Disable ${s.userId}? They won't be able to log in.`
                              )
                            }
                            className="rounded-lg border border-border px-2.5 py-1 text-xs text-amber-300 hover:bg-surface-2"
                          >
                            Disable
                          </button>
                        )}
                        <button
                          onClick={() =>
                            action(
                              s.userId,
                              "delete",
                              `Permanently delete ${s.userId}? This removes their row from the sheet.`
                            )
                          }
                          className="rounded-lg border border-border px-2.5 py-1 text-xs text-red-300 hover:bg-surface-2"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="text-3xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}
