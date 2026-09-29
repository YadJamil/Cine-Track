"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type StripDay = {
  iso: string;
  dayNum: number;
  weekdayLabel: string;
  hasEpisodes: boolean;
  isToday: boolean;
};

/**
 * Mobile calendar surface: a horizontally-scrollable strip of day chips that
 * doubles as a jump-to-day nav for the agenda list below (matching ids of the
 * form `day-${iso}`). Native scroll only — no gesture library.
 */
export function DayStrip({
  days,
  initialSelectedIso,
}: {
  days: StripDay[];
  initialSelectedIso: string;
}) {
  const [selectedIso, setSelectedIso] = useState(initialSelectedIso);
  const selectedRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    // Mount only — bring the initial selection into view within the strip
    // itself (e.g. today, if mid-month) without animating on first paint.
    selectedRef.current?.scrollIntoView({
      behavior: "instant",
      block: "nearest",
      inline: "center",
    });
  }, []);

  function handleSelect(iso: string) {
    setSelectedIso(iso);
    document.getElementById(`day-${iso}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <nav aria-label="Jump to day" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-2 pb-1">
        {days.map((d) => (
          <li key={d.iso} ref={d.iso === selectedIso ? selectedRef : undefined}>
            <button
              type="button"
              onClick={() => handleSelect(d.iso)}
              aria-current={d.iso === selectedIso ? "date" : undefined}
              className={cn(
                "flex w-11 shrink-0 flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-center transition-colors",
                d.iso === selectedIso
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="text-[10px] font-medium uppercase">
                {d.weekdayLabel}
              </span>
              <span className={cn("text-sm tabular-nums", d.isToday && "font-bold")}>
                {d.dayNum}
              </span>
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  d.hasEpisodes ? "bg-primary" : "bg-transparent",
                )}
              />
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
