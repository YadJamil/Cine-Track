"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatLoader } from "@/components/cat/cat-loader";
import { Input } from "@/components/ui/input";

const RECENT_KEY = "episode.recent-searches";
const MAX_RECENT = 8;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export function SearchInput({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [recent, setRecent] = useState<string[]>([]);
  // Same-route searchParam navigations don't re-trigger the route's loading.tsx,
  // so track the in-flight search here and show our own pending state.
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRecent(readRecent());
  }, []);

  function submit(query: string) {
    const q = query.trim();
    if (!q) return;
    const next = [q, ...readRecent().filter((r) => r !== q)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    setRecent(next);
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search shows, movies, people…"
            className="pl-9"
            aria-label="Search"
            autoFocus={!initialQuery}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Searching…" : "Search"}
        </Button>
      </form>

      {pending ? <CatLoader label={`Hunting for “${value.trim()}”…`} /> : null}

      {!initialQuery && recent.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Recent:</span>
          {recent.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setValue(r);
                submit(r);
              }}
              className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
            >
              {r}
            </button>
          ))}
          <button
            type="button"
            aria-label="Clear recent searches"
            onClick={() => {
              localStorage.removeItem(RECENT_KEY);
              setRecent([]);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
