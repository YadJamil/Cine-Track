"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Check, Film, Plus, Search, Tv, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { searchMedia, type MediaSearchResults } from "@/features/search/actions";
import { markMultipleWatched } from "@/features/tracking/actions";
import { posterUrl } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";

const EMPTY: MediaSearchResults = { shows: [], movies: [] };

type SelectedItem = {
  type: "show" | "movie";
  tmdbId: number | string;
  title: string;
  posterPath: string | null;
};

/**
 * Fast backlog logging: search shows/movies, tap to multi-select, mark them
 * all watched in one submit. Popup shell/debounce pattern mirrors
 * CommandSearch, minus its single-select keyboard-nav machinery (nothing to
 * "go to" here — selecting just toggles, it doesn't navigate).
 */
export function LogWatchedDialog({ username }: { username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaSearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Map<string, SelectedItem>>(new Map());
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++requestId.current;
    const t = setTimeout(async () => {
      const res = await searchMedia(query, 20);
      if (id !== requestId.current) return;
      setResults(res.ok ? res.data : EMPTY);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function toggle(item: SelectedItem) {
    setSelected((prev) => {
      const next = new Map(prev);
      const key = `${item.type}-${item.tmdbId}`;
      if (next.has(key)) next.delete(key);
      else next.set(key, item);
      return next;
    });
  }

  function reset() {
    setSelected(new Map());
    setQuery("");
    setResults(EMPTY);
  }

  function submit() {
    startTransition(async () => {
      const res = await markMultipleWatched({
        shows: [...selected.values()]
          .filter((i) => i.type === "show")
          .map((i) => ({ tmdbId: i.tmdbId as number, title: i.title })),
        movies: [...selected.values()]
          .filter((i) => i.type === "movie")
          .map((i) => ({ tmdbId: i.tmdbId as string, title: i.title })),
        username,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data.failed.length > 0) {
        toast.warning(`Marked ${res.data.marked}, ${res.data.failed.length} failed`, {
          description: res.data.failed.map((f) => f.title).join(", "),
        });
      } else {
        toast.success(`Marked ${res.data.marked} as watched`);
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        aria-label="Log watched shows or movies"
        onClick={() => setOpen(true)}
      >
        <Plus aria-hidden />
      </Button>

      <DialogPrimitive.Root
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md transition-opacity duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <DialogPrimitive.Popup className="fixed top-[10%] left-1/2 z-50 flex max-h-[80vh] w-full max-w-2xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/95 shadow-[0_24px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl outline-none duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <DialogPrimitive.Title className="sr-only">
              Log watched shows or movies
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Search for shows or movies you have already watched and mark several
              at once.
            </DialogPrimitive.Description>

            <div className="flex items-center gap-3 border-b border-zinc-900 bg-zinc-900/20 px-4 py-3">
              <Search className="size-5 shrink-0 text-muted-foreground/60" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shows or movies you've watched…"
                className="flex-1 border-0 bg-transparent py-1 text-base text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              <DialogPrimitive.Close className="shrink-0 cursor-pointer rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-zinc-900 hover:text-foreground">
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
                  <div className="size-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                  Searching…
                </div>
              ) : query.trim().length < 2 ? (
                <div className="py-12 text-center text-sm text-muted-foreground/60">
                  Search for a show or movie to mark as watched
                </div>
              ) : results.shows.length === 0 && results.movies.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground/60">
                  No results found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {results.shows.length > 0 ? (
                    <div>
                      <h3
                        id="log-watched-shows-heading"
                        className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60"
                      >
                        TV Shows
                      </h3>
                      <ul
                        role="listbox"
                        aria-labelledby="log-watched-shows-heading"
                        aria-multiselectable="true"
                        className="grid grid-cols-4 gap-2 sm:grid-cols-6"
                      >
                        {results.shows.map((s) => {
                          const key = `show-${s.tmdbId}`;
                          return (
                            <PickerPoster
                              key={key}
                              title={s.name}
                              posterPath={s.posterPath}
                              icon={<Tv className="size-4 opacity-60" aria-hidden />}
                              isSelected={selected.has(key)}
                              onToggle={() =>
                                toggle({
                                  type: "show",
                                  tmdbId: s.tmdbId,
                                  title: s.name,
                                  posterPath: s.posterPath,
                                })
                              }
                            />
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {results.movies.length > 0 ? (
                    <div>
                      <h3
                        id="log-watched-movies-heading"
                        className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60"
                      >
                        Movies
                      </h3>
                      <ul
                        role="listbox"
                        aria-labelledby="log-watched-movies-heading"
                        aria-multiselectable="true"
                        className="grid grid-cols-4 gap-2 sm:grid-cols-6"
                      >
                        {results.movies.map((m) => {
                          const key = `movie-${m.tmdbId}`;
                          return (
                            <PickerPoster
                              key={key}
                              title={m.title}
                              posterPath={m.posterPath}
                              icon={<Film className="size-4 opacity-60" aria-hidden />}
                              isSelected={selected.has(key)}
                              onToggle={() =>
                                toggle({
                                  type: "movie",
                                  tmdbId: m.tmdbId,
                                  title: m.title,
                                  posterPath: m.posterPath,
                                })
                              }
                            />
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {selected.size > 0 ? (
              <div className="flex gap-2 overflow-x-auto border-t border-zinc-900 px-4 py-2.5">
                {[...selected.values()].map((item) => {
                  const key = `${item.type}-${item.tmdbId}`;
                  const poster = posterUrl(item.posterPath, "w154");
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggle(item)}
                      className="group flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 py-1 pr-2 pl-1 text-xs"
                    >
                      <span className="relative block size-5 shrink-0 overflow-hidden rounded-full bg-muted">
                        {poster ? (
                          <Image src={poster} alt="" fill sizes="20px" className="object-cover" />
                        ) : null}
                      </span>
                      <span className="max-w-24 truncate">{item.title}</span>
                      <X
                        className="size-3 text-muted-foreground group-hover:text-foreground"
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="border-t border-zinc-900 bg-zinc-900/20 p-3">
              <Button
                onClick={submit}
                disabled={pending || selected.size === 0}
                size="lg"
                className="w-full"
              >
                {pending
                  ? "Marking…"
                  : selected.size === 0
                    ? "Select titles to mark"
                    : `Mark ${selected.size} as watched`}
              </Button>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

function PickerPoster({
  title,
  posterPath,
  icon,
  isSelected,
  onToggle,
}: {
  title: string;
  posterPath: string | null;
  icon: React.ReactNode;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const poster = posterUrl(posterPath, "w342");
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={onToggle}
        className={cn(
          "group relative block w-full overflow-hidden rounded-lg border-2 transition focus-visible:outline-2 focus-visible:outline-ring",
          isSelected ? "border-primary" : "border-transparent",
        )}
      >
        <div className="relative aspect-[2/3] bg-muted">
          {poster ? (
            <Image
              src={poster}
              alt={`${title} poster`}
              fill
              sizes="(max-width: 640px) 25vw, 15vw"
              className="object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-1 text-center text-[10px] text-muted-foreground">
              {icon}
              {title}
            </span>
          )}
          {isSelected ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Check className="size-6 text-primary" aria-hidden />
            </span>
          ) : null}
        </div>
        <span className="sr-only">{title}</span>
      </button>
    </li>
  );
}
