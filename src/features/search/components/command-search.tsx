"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Film, Search, Tv, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { posterUrl } from "@/lib/tmdb/images";
import { searchAll, type SearchResults } from "../actions";

const EMPTY: SearchResults = { shows: [], movies: [], users: [] };

interface FlattenedItem {
  id: string;
  type: "show" | "movie" | "user" | "action";
  title: string;
  subtitle?: string | null;
  href: string;
  posterPath?: string | null;
}

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++requestId.current;
    const t = setTimeout(async () => {
      const res = await searchAll(query);
      if (id !== requestId.current) return;
      setResults(res.ok ? res.data : EMPTY);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  const flatItems = useMemo(() => {
    const list: FlattenedItem[] = [];
    results.shows.forEach((s) => {
      list.push({
        id: `show-${s.tmdbId}`,
        type: "show",
        title: s.name,
        subtitle: s.year ? `${s.year}` : null,
        href: `/shows/${s.tmdbId}`,
        posterPath: s.posterPath,
      });
    });
    results.movies.forEach((m) => {
      list.push({
        id: `movie-${m.tmdbId}`,
        type: "movie",
        title: m.title,
        subtitle: m.year ? `${m.year}` : null,
        href: `/movies/${m.tmdbId}`,
        posterPath: m.posterPath,
      });
    });
    results.users.forEach((u) => {
      list.push({
        id: `user-${u.id}`,
        type: "user",
        title: u.displayName || u.username,
        subtitle: `@${u.username}`,
        href: `/profile/${u.username}`,
      });
    });
    if (query.trim().length >= 2) {
      list.push({
        id: "full-search",
        type: "action",
        title: `See all results for “${query}”`,
        href: `/search?q=${encodeURIComponent(query)}`,
      });
    }
    return list;
  }, [results, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [flatItems]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flatItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatItems[activeIndex];
      if (target) {
        go(target.href);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search (⌘K)"
        className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring md:w-full md:justify-start md:gap-2 md:border md:px-3 md:text-sm md:text-muted-foreground cursor-pointer"
      >
        <Search className="size-4" aria-hidden />
        <span className="hidden md:inline">Search…</span>
        <kbd className="ml-auto hidden rounded bg-muted px-1.5 text-[10px] md:inline">
          ⌘K
        </kbd>
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md transition-opacity duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <DialogPrimitive.Popup className="fixed top-[10%] left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 bg-zinc-950/95 border border-zinc-900 shadow-[0_24px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl p-0 overflow-hidden rounded-2xl duration-200 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Search shows, movies and people</DialogPrimitive.Description>
            
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-900 bg-zinc-900/20">
              <Search className="size-5 text-muted-foreground/60 shrink-0" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search shows, movies, people…"
                className="flex-1 bg-transparent border-0 outline-none text-base text-foreground placeholder:text-muted-foreground/60 py-1"
              />
              <DialogPrimitive.Close className="shrink-0 rounded-lg p-1.5 hover:bg-zinc-900 text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer">
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3 no-scrollbar flex flex-col gap-4">
              {loading ? (
                <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
                  <div className="size-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  Searching…
                </div>
              ) : query.trim().length < 2 ? (
                <div className="py-12 text-center text-sm text-muted-foreground/60">
                  Type at least 2 characters to search
                </div>
              ) : flatItems.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground/60">
                  No results found for “{query}”
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Shows Group */}
                  {results.shows.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase px-2 mb-1.5">
                        Shows
                      </h3>
                      <div className="flex flex-col gap-0.5">
                        {results.shows.map((s) => {
                          const itemIndex = flatItems.findIndex((x) => x.id === `show-${s.tmdbId}`);
                          const isActive = activeIndex === itemIndex;
                          return (
                            <Link
                              key={`show-${s.tmdbId}`}
                              href={`/shows/${s.tmdbId}`}
                              onClick={() => go(`/shows/${s.tmdbId}`)}
                              className={cn(
                                "flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all duration-200 border border-transparent cursor-pointer",
                                isActive
                                  ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_12px_rgba(251,215,55,0.06)]"
                                  : "hover:bg-secondary/40 text-foreground"
                              )}
                            >
                              <SearchThumb posterPath={s.posterPath} fallback={<Tv className="size-4 opacity-60" aria-hidden />} />
                              <span className="flex-1 truncate text-sm font-medium">{s.name}</span>
                              {s.year && (
                                <span className="text-xs text-muted-foreground/85 tabular-nums pr-1">
                                  {s.year}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Movies Group */}
                  {results.movies.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase px-2 mb-1.5">
                        Movies
                      </h3>
                      <div className="flex flex-col gap-0.5">
                        {results.movies.map((m) => {
                          const itemIndex = flatItems.findIndex((x) => x.id === `movie-${m.tmdbId}`);
                          const isActive = activeIndex === itemIndex;
                          return (
                            <Link
                              key={`movie-${m.tmdbId}`}
                              href={`/movies/${m.tmdbId}`}
                              onClick={() => go(`/movies/${m.tmdbId}`)}
                              className={cn(
                                "flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all duration-200 border border-transparent cursor-pointer",
                                isActive
                                  ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_12px_rgba(251,215,55,0.06)]"
                                  : "hover:bg-secondary/40 text-foreground"
                              )}
                            >
                              <SearchThumb posterPath={m.posterPath} fallback={<Film className="size-4 opacity-60" aria-hidden />} />
                              <span className="flex-1 truncate text-sm font-medium">{m.title}</span>
                              {m.year && (
                                <span className="text-xs text-muted-foreground/85 tabular-nums pr-1">
                                  {m.year}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* People Group */}
                  {results.users.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase px-2 mb-1.5">
                        People
                      </h3>
                      <div className="flex flex-col gap-0.5">
                        {results.users.map((u) => {
                          const itemIndex = flatItems.findIndex((x) => x.id === `user-${u.id}`);
                          const isActive = activeIndex === itemIndex;
                          return (
                            <Link
                              key={`user-${u.id}`}
                              href={`/profile/${u.username}`}
                              onClick={() => go(`/profile/${u.username}`)}
                              className={cn(
                                "flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all duration-200 border border-transparent cursor-pointer",
                                isActive
                                  ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_12px_rgba(251,215,55,0.06)]"
                                  : "hover:bg-secondary/40 text-foreground"
                              )}
                            >
                              <div className="size-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                                <User className="size-4 text-muted-foreground/70" aria-hidden />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col">
                                <span className="truncate text-sm font-medium">{u.displayName || u.username}</span>
                                <span className="text-xs text-muted-foreground/75 truncate">@{u.username}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Full Search Action at the bottom */}
                  {query.trim().length >= 2 && (
                    <div className="pt-1.5 border-t border-zinc-900">
                      {(() => {
                        const itemIndex = flatItems.findIndex((x) => x.id === "full-search");
                        const isActive = activeIndex === itemIndex;
                        return (
                          <Link
                            href={`/search?q=${encodeURIComponent(query)}`}
                            onClick={() => go(`/search?q=${encodeURIComponent(query)}`)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border border-transparent text-sm font-semibold cursor-pointer",
                              isActive
                                ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_12px_rgba(251,215,55,0.06)]"
                                : "hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Search className="size-4 opacity-70" aria-hidden />
                            <span>See all results for “{query}”</span>
                          </Link>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

function SearchThumb({
  posterPath,
  fallback,
}: {
  posterPath: string | null;
  fallback: React.ReactNode;
}) {
  const url = posterUrl(posterPath, "w154");
  if (!url) return <>{fallback}</>;
  return (
    <span className="relative block h-9 w-6 shrink-0 overflow-hidden rounded-sm bg-muted">
      <Image src={url} alt="" fill sizes="24px" className="object-cover" />
    </span>
  );
}
