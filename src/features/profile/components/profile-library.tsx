"use client";

import { useMemo, useState } from "react";
import { Star, Tv } from "lucide-react";
import { MediaPoster } from "@/components/shared/media-poster";
import { EmptyState } from "@/components/shared/empty-state";
import {
  BUCKET_META,
  BUCKET_ORDER,
  isBucket,
  PosterStatusDot,
} from "@/components/shared/show-status";
import { cn } from "@/lib/utils";

export type LibraryItem = {
  key: string;
  href: string;
  title: string;
  posterUrl: string | null;
  subtitle?: string | null;
  progress?: number;
  /** Present for shows; absent for movies (hides the status filter). */
  status?: string | null;
  favorite?: boolean;
  genres: string[];
};


function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-300 backdrop-blur-xs cursor-pointer select-none active:scale-95",
        active
          ? "border-primary bg-primary/10 text-primary shadow-[0_2px_8px_rgba(251,215,55,0.06)]"
          : "border-border/60 bg-secondary/20 text-muted-foreground/80 hover:bg-secondary/40 hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

export function ProfileLibrary({
  items,
  emptyTitle,
  emptyDescription,
}: {
  items: LibraryItem[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [status, setStatus] = useState("all");
  const [genre, setGenre] = useState("all");

  const hasStatus = items.some((i) => i.status != null);
  const hasFavorites = items.some((i) => i.favorite);
  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) for (const g of i.genres) set.add(g);
    return [...set].sort();
  }, [items]);
  // Only offer filters that would actually return something.
  const statuses = useMemo(
    () => BUCKET_ORDER.filter((b) => items.some((i) => i.status === b)),
    [items],
  );

  const counts = useMemo(() => {
    const res: Record<string, number> = {
      all: items.length,
      favorites: items.filter((i) => i.favorite).length,
    };
    for (const bucket of BUCKET_ORDER) {
      res[bucket] = items.filter((i) => i.status === bucket).length;
    }
    return res;
  }, [items]);

  const matchesStatus = (i: LibraryItem) =>
    status === "all" ||
    (status === "favorites" ? !!i.favorite : i.status === status);

  const filtered = items.filter(
    (i) => matchesStatus(i) && (genre === "all" || i.genres.includes(genre)),
  );

  return (
    <div className="flex flex-col gap-4">
      {hasStatus ? (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
          <Chip
            active={status === "all"}
            onClick={() => setStatus("all")}
            className={status === "all" ? "border-primary/30 bg-primary/10 text-primary shadow-[0_2px_8px_rgba(251,215,55,0.06)]" : ""}
          >
            <span className="flex items-center gap-1.5">
              All
              <span className={cn(
                "flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[9px] font-bold tabular-nums transition-all duration-300 bg-muted text-muted-foreground",
                status === "all" && "bg-primary/20 text-primary"
              )}>
                {counts.all}
              </span>
            </span>
          </Chip>
          {hasFavorites ? (
            <Chip
              active={status === "favorites"}
              onClick={() => setStatus("favorites")}
              className={status === "favorites" ? "border-amber-400/30 bg-amber-400/10 text-amber-400 shadow-[0_2px_8px_rgba(245,158,11,0.06)]" : ""}
            >
              <span className="flex items-center gap-1.5">
                <Star
                  className="size-3 fill-current"
                  aria-hidden
                />
                Favorites
                <span className={cn(
                  "flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[9px] font-bold tabular-nums transition-all duration-300 bg-muted text-muted-foreground",
                  status === "favorites" && "bg-amber-400/20 text-amber-400"
                )}>
                  {counts.favorites}
                </span>
              </span>
            </Chip>
          ) : null}
          {statuses.map((bucket) => {
            const isActive = status === bucket;
            const count = counts[bucket] ?? 0;
            return (
              <Chip
                key={bucket}
                active={isActive}
                onClick={() => setStatus(bucket)}
                className={cn(
                  isActive && bucket === "watching" && "border-primary/30 bg-primary/10 text-primary shadow-[0_2px_8px_rgba(251,215,55,0.06)]",
                  isActive && bucket === "up_to_date" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_2px_8px_rgba(16,185,129,0.06)]",
                  isActive && bucket === "completed" && "border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-[0_2px_8px_rgba(168,85,247,0.06)]",
                  isActive && bucket === "watchlist" && "border-sky-500/30 bg-sky-500/10 text-sky-400 shadow-[0_2px_8px_rgba(14,165,233,0.06)]",
                  isActive && bucket === "watch_later" && "border-orange-500/30 bg-orange-500/10 text-orange-400 shadow-[0_2px_8px_rgba(249,115,22,0.06)]",
                  isActive && bucket === "stopped" && "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full transition-transform duration-300",
                      isActive && "scale-125 shadow-[0_0_6px_currentColor]",
                      BUCKET_META[bucket].dot
                    )}
                    aria-hidden
                  />
                  {BUCKET_META[bucket].label}
                  <span className={cn(
                    "flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[9px] font-bold tabular-nums transition-all duration-300 bg-muted text-muted-foreground",
                    isActive && bucket === "watching" && "bg-primary/20 text-primary",
                    isActive && bucket === "up_to_date" && "bg-emerald-500/20 text-emerald-400",
                    isActive && bucket === "completed" && "bg-purple-500/20 text-purple-400",
                    isActive && bucket === "watchlist" && "bg-sky-500/20 text-sky-400",
                    isActive && bucket === "watch_later" && "bg-orange-500/20 text-orange-400",
                    isActive && bucket === "stopped" && "bg-zinc-500/20 text-zinc-300"
                  )}>
                    {count}
                  </span>
                </span>
              </Chip>
            );
          })}
        </div>
      ) : null}

      {genres.length > 0 ? (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
          <Chip active={genre === "all"} onClick={() => setGenre("all")}>
            All genres
          </Chip>
          {genres.map((g) => (
            <Chip key={g} active={genre === g} onClick={() => setGenre(g)}>
              {g}
            </Chip>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Tv}
          title={items.length === 0 ? emptyTitle : "Nothing matches"}
          description={
            items.length === 0
              ? emptyDescription
              : "Try a different status or genre."
          }
        />
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {filtered.map((i) => (
            <MediaPoster
              key={i.key}
              href={i.href}
              title={i.title}
              posterUrl={i.posterUrl}
              subtitle={i.subtitle}
              progress={i.progress}
              badge={
                isBucket(i.status) ? <PosterStatusDot bucket={i.status} /> : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
