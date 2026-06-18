import { cookies } from "next/headers";
import { getStudentByUserId, type Student } from "./sheets";
import {
  ADMIN_COOKIE,
  STUDENT_COOKIE,
  isExpired,
  parseStudentCookie,
  verifyAdminCookie,
} from "./session";

/** True when the request carries a valid admin session cookie. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyAdminCookie(store.get(ADMIN_COOKIE)?.value);
}

/**
 * Resolve and validate the current student from the request cookie.
 *
 * The cookie carries `userId|token`. It only counts as logged in when the
 * token matches the one stored in the sheet AND hasn't expired — this is what
 * enforces the single-device rule: when another device logs in (or the admin
 * resets the session) the stored token changes/clears and this fails.
 */
export async function getCurrentStudent(): Promise<Student | null> {
  const store = await cookies();
  const parsed = parseStudentCookie(store.get(STUDENT_COOKIE)?.value);
  if (!parsed) return null;

  const student = await getStudentByUserId(parsed.userId);
  if (!student) return null;
  if (!student.sessionToken || student.sessionToken !== parsed.token) return null;
  if (isExpired(student.sessionExpiresAt)) return null;
  return student;
}

/** Shape returned to the client — never includes the password. */
export function publicStudent(s: Student) {
  return {
    userId: s.userId,
    name: s.name,
    progress: s.progress,
  };
}
