"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Student routes reachable without logging in. Everything else is gated. */
const PUBLIC_ROUTES = ["/login"];

function Splash() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-muted">
        <span className="grid h-12 w-12 animate-pulse place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-2xl">
          🚀
        </span>
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  // The admin section (/admin, /admin/login) has its own auth — let it through.
  const isAdminArea = pathname.startsWith("/admin");
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (isAdminArea) return;
    if (!ready) return;
    // Not logged in on a protected route → force login first.
    if (!user && !isPublic) router.replace("/login");
    // Already logged in but sitting on an auth page → send to dashboard.
    if (user && isPublic) router.replace("/dashboard");
  }, [ready, user, isPublic, isAdminArea, router]);

  // Admin pages render freely and guard themselves.
  if (isAdminArea) return <>{children}</>;

  // Wait for the session to be restored before deciding anything.
  if (!ready) return <Splash />;

  // While a redirect is in flight, don't flash protected/public content.
  if (!user && !isPublic) return <Splash />;
  if (user && isPublic) return <Splash />;

  return <>{children}</>;
}
