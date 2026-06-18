import crypto from "crypto";

/** Student session cookie: value is `userId|token`, validated against the sheet. */
export const STUDENT_COOKIE = "cc_session";
/** Admin session cookie: an HMAC of a fixed payload signed with SESSION_SECRET. */
export const ADMIN_COOKIE = "cc_admin";

/** How long a student session stays valid (and keeps the single-device lock). */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function randomToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function expiryFromNow(): string {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

export function isExpired(iso: string): boolean {
  if (!iso) return true;
  const t = Date.parse(iso);
  return Number.isNaN(t) || t < Date.now();
}

/** True when a student currently holds an active session (locks other devices). */
export function hasActiveSession(sessionToken: string, expiresAt: string): boolean {
  return Boolean(sessionToken) && !isExpired(expiresAt);
}

export function makeStudentCookie(userId: string, token: string): string {
  return `${userId}|${token}`;
}

export function parseStudentCookie(
  value: string | undefined
): { userId: string; token: string } | null {
  if (!value) return null;
  const idx = value.indexOf("|");
  if (idx === -1) return null;
  return { userId: value.slice(0, idx), token: value.slice(idx + 1) };
}

// ── Admin cookie signing ─────────────────────────────────────────────────────

function secret(): string {
  return process.env.SESSION_SECRET || "dev-insecure-secret";
}

export function makeAdminCookie(): string {
  return crypto.createHmac("sha256", secret()).update("admin-v1").digest("hex");
}

export function verifyAdminCookie(value: string | undefined): boolean {
  if (!value) return false;
  const expected = makeAdminCookie();
  // Constant-time compare.
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
