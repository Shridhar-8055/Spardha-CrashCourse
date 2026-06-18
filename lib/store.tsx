"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Client-side auth + "watched" store, backed by the server APIs (which persist
 * to Google Sheets). The browser never sees the session token — it lives in an
 * httpOnly cookie. "watched" is the set of video ids the student has marked.
 */

export interface User {
  userId: string;
  name: string;
}

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface StoreValue {
  user: User | null;
  ready: boolean;
  configError: string | null;
  login: (name: string, userId: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  watched: Set<string>;
  toggleWatched: (videoId: string) => Promise<void>;
  isWatched: (videoId: string) => boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Restore session on mount via the server.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        if (data.configError) setConfigError(data.configError);
        if (data.user) {
          setUser({ userId: data.user.userId, name: data.user.name });
          setWatched(new Set<string>(data.user.progress ?? []));
        }
      } catch {
        /* offline / network — treat as logged out */
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (name: string, userId: string, password: string): Promise<AuthResult> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, userId, password }),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error ?? "Login failed." };
        setUser({ userId: data.user.userId, name: data.user.name });
        setWatched(new Set<string>(data.user.progress ?? []));
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error. Please try again." };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setUser(null);
    setWatched(new Set());
  }, []);

  const toggleWatched = useCallback(
    async (videoId: string) => {
      if (!user) return;
      const willMark = !watched.has(videoId);
      setWatched((prev) => {
        const next = new Set(prev);
        if (willMark) next.add(videoId);
        else next.delete(videoId);
        return next;
      });
      try {
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId: videoId, completed: willMark }),
        });
        const data = await res.json();
        if (res.ok && data.user)
          setWatched(new Set<string>(data.user.progress ?? []));
        else throw new Error(data.error);
      } catch {
        // Roll back on failure.
        setWatched((prev) => {
          const next = new Set(prev);
          if (willMark) next.delete(videoId);
          else next.add(videoId);
          return next;
        });
      }
    },
    [user, watched]
  );

  const isWatched = useCallback(
    (videoId: string) => watched.has(videoId),
    [watched]
  );

  const value = useMemo<StoreValue>(
    () => ({
      user,
      ready,
      configError,
      login,
      logout,
      watched,
      toggleWatched,
      isWatched,
    }),
    [user, ready, configError, login, logout, watched, toggleWatched, isWatched]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}
