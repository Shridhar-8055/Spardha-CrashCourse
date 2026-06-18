"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <span className="flex items-center gap-2.5 font-bold">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/spardha-logo.png"
        alt="Sri Spardha Academy"
        className="h-9 w-9 rounded-full object-contain"
      />
      <span className="leading-tight">
        <span className="block text-base tracking-tight">Sri Spardha Academy</span>
        {subtitle && (
          <span className="block text-[11px] font-medium text-muted">{subtitle}</span>
        )}
      </span>
    </span>
  );
}

export default function Navbar() {
  const { user, logout, ready } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Admin section gets its own minimal header.
  if (pathname.startsWith("/admin")) {
    return (
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/admin">
            <Logo subtitle="Admin" />
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted transition-colors hover:text-text"
          >
            Student site →
          </Link>
        </nav>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href={user ? "/" : "/login"}>
          <Logo />
        </Link>

        <div className="flex items-center gap-3">
          {!ready ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-2" />
          ) : user ? (
            <>
              <div className="hidden items-center gap-2 sm:flex" title={user.userId}>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-sm font-semibold uppercase">
                  {user.name.charAt(0) || "?"}
                </span>
                <span className="text-sm text-muted">
                  {user.name.split(" ")[0] || user.userId}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-text"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-gradient-to-r from-brand to-brand-2 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-transform hover:scale-[1.03]"
            >
              Log in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
