/**
 * Data layer backed by a Google Apps Script Web App.
 *
 * Instead of the Sheets API + service account, the Google Sheet hosts an
 * Apps Script (see SETUP.md / apps-script/Code.gs) deployed as a Web App. We
 * POST JSON commands to its URL; the script reads/writes the "Students" tab.
 *
 * Auth is a shared secret (APPS_SCRIPT_SECRET) that must match the SECRET set
 * inside the script.
 */

export interface Student {
  userId: string;
  password: string;
  name: string;
  status: string;
  sessionToken: string;
  sessionExpiresAt: string;
  lastLoginAt: string;
  lastDevice: string;
  loginCount: number;
  progress: string[];
  createdAt: string;
}

export class SheetsConfigError extends Error {}

function getEnv() {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret) {
    throw new SheetsConfigError(
      "Google Apps Script is not configured. Set APPS_SCRIPT_URL and APPS_SCRIPT_SECRET in .env.local (see SETUP.md)."
    );
  }
  return { url, secret };
}

type Action =
  | "list"
  | "get"
  | "append"
  | "update"
  | "delete"
  | "videoTitles"
  | "setVideoTitle";

async function callScript(
  action: Action,
  payload: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const { url, secret } = getEnv();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, action, ...payload }),
      cache: "no-store",
      redirect: "follow",
    });
  } catch (e) {
    throw new Error(`Could not reach Apps Script: ${(e as Error).message}`);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apps Script HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error(
      "Apps Script returned non-JSON (check the deployment is a Web App with access set to 'Anyone')."
    );
  }
  if (data.error) {
    if (data.error === "unauthorized")
      throw new SheetsConfigError(
        "Apps Script rejected the secret. APPS_SCRIPT_SECRET must match SECRET in the script."
      );
    throw new Error(`Apps Script: ${data.error}`);
  }
  return data;
}

function normalize(raw: Partial<Student>): Student {
  return {
    userId: String(raw.userId ?? ""),
    password: String(raw.password ?? ""),
    name: String(raw.name ?? ""),
    status: String(raw.status ?? "") || "active",
    sessionToken: String(raw.sessionToken ?? ""),
    sessionExpiresAt: String(raw.sessionExpiresAt ?? ""),
    lastLoginAt: String(raw.lastLoginAt ?? ""),
    lastDevice: String(raw.lastDevice ?? ""),
    loginCount: Number(raw.loginCount ?? 0) || 0,
    progress: Array.isArray(raw.progress) ? raw.progress.map(String) : [],
    createdAt: String(raw.createdAt ?? ""),
  };
}

// ── Reads ──────────────────────────────────────────────────────────────────

export async function getStudents(): Promise<Student[]> {
  const data = await callScript("list");
  const arr = (data.students as Partial<Student>[]) ?? [];
  return arr.map(normalize);
}

export async function getStudentByUserId(
  userId: string
): Promise<Student | null> {
  const data = await callScript("get", { userId });
  return data.student ? normalize(data.student as Partial<Student>) : null;
}

// ── Writes ───────────────────────────────────────────────────────────────────

export async function appendStudent(student: Student): Promise<void> {
  await callScript("append", { student });
}

export async function updateStudent(student: Student): Promise<void> {
  await callScript("update", { student });
}

export async function deleteStudent(userId: string): Promise<void> {
  await callScript("delete", { userId });
}

// ── Video title overrides (admin-renamed video names, keyed by YouTube id) ──

/** Returns a { youtubeId: customTitle } map. Tolerant: {} if not yet supported. */
export async function getVideoTitleOverrides(): Promise<Record<string, string>> {
  try {
    const data = await callScript("videoTitles");
    return (data.titles as Record<string, string>) ?? {};
  } catch {
    // Apps Script not updated yet (unknown action) or unreachable — no overrides.
    return {};
  }
}

export async function setVideoTitle(key: string, title: string): Promise<void> {
  await callScript("setVideoTitle", { key, title });
}
