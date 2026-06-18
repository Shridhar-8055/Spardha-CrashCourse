"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";

interface VideoItem {
  id: string;
  title: string;
  uploadedAt: string;
  num: number; // stable lesson number (original order)
}

type SortKey = "default" | "newest" | "oldest" | "title" | "unwatched";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "Default order" },
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "title", label: "Title (A–Z)" },
  { key: "unwatched", label: "Unwatched first" },
];

export default function VideoLibraryPage() {
  const { user, isWatched, toggleWatched, watched } = useStore();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("default");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/videos", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(data.error ?? "Could not load videos.");
        } else {
          const list: VideoItem[] = (data.videos ?? []).map(
            (v: Omit<VideoItem, "num">, i: number) => ({ ...v, num: i + 1 })
          );
          setVideos(list);
          setSelectedId((prev) => prev ?? list[0]?.id ?? null);
        }
      } catch {
        if (active) setError("Network error loading videos.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selected = useMemo(
    () => videos.find((v) => v.id === selectedId) ?? null,
    [videos, selectedId]
  );
  const watchedCount = videos.filter((v) => watched.has(v.id)).length;

  const sortedVideos = useMemo(() => {
    const list = [...videos];
    switch (sortBy) {
      case "newest":
        return list.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      case "oldest":
        return list.sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
      case "title":
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case "unwatched":
        return list.sort(
          (a, b) => Number(watched.has(a.id)) - Number(watched.has(b.id))
        );
      default:
        return list.sort((a, b) => a.num - b.num);
    }
  }, [videos, sortBy, watched]);

  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Video Lessons
          </h1>
          {user && (
            <p className="mt-1 text-sm text-muted">
              Welcome, {user.name.split(" ")[0]} · {watchedCount}/{videos.length}{" "}
              watched
            </p>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-muted">
          Loading videos…
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-muted">
          No videos available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          {/* Player */}
          <div>
            <div className="overflow-hidden rounded-2xl border border-border bg-black">
              <div className="relative aspect-video w-full">
                {selected && (
                  <iframe
                    key={selected.id}
                    src={`/api/videos/${selected.id}/frame`}
                    title={selected.title}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerated-encoding; autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                )}
              </div>
            </div>

            {selected && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold">{selected.title}</h2>
                <button
                  onClick={() => toggleWatched(selected.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    isWatched(selected.id)
                      ? "border border-brand bg-brand/10 text-brand"
                      : "bg-gradient-to-r from-brand to-brand-2 text-white shadow-lg shadow-brand/20 hover:scale-[1.02]"
                  }`}
                >
                  {isWatched(selected.id) ? "✓ Watched" : "Mark as watched"}
                </button>
              </div>
            )}
          </div>

          {/* Playlist */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                {videos.length} lessons
              </span>
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <span>Sort by</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-text outline-none focus:border-brand"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ul className="space-y-2">
              {sortedVideos.map((v) => {
                const active = v.id === selectedId;
                const done = watched.has(v.id);
                return (
                  <li key={v.id}>
                    <button
                      onClick={() => setSelectedId(v.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                        active
                          ? "border-brand/60 bg-surface-2"
                          : "border-border bg-surface hover:border-brand/40 hover:bg-surface-2"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                          active
                            ? "bg-gradient-to-br from-brand to-brand-2 text-white"
                            : "bg-surface-2 text-muted"
                        }`}
                      >
                        {v.num}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {v.title}
                        </span>
                        <span className="text-xs text-muted">
                          {active ? "Now playing" : done ? "Watched" : "Tap to play"}
                        </span>
                      </span>
                      {done && (
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-[10px] text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
