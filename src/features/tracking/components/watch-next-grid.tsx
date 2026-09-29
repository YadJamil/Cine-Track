"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Check, Compass } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatAirDate, formatEpisodeCode } from "@/lib/format";
import { backdropUrl, posterUrl } from "@/lib/tmdb/images";
import type { WatchNextRow } from "../queries";
import { markWatched, unmarkWatched } from "../actions";

/** A row being advanced: the episode was just marked, the next one is loading. */
type Row = WatchNextRow & { advancing?: boolean };

/**
 * Watch Next as a "hero + rail": the episode to watch right now gets a big
 * featured card; everything else queues up in a horizontal rail below. Marking
 * an episode watched advances the show to its next episode IN PLACE — a show
 * only leaves the rail once there's nothing aired left to watch.
 */
export function WatchNextGrid({ rows: initialRows }: { rows: WatchNextRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [, startTransition] = useTransition();

  // router.refresh() re-renders the page with fresh server data; adopt it as
  // the new source of truth (it carries each show's real next episode).
  // Without this, optimistic edits stick until a full reload.
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  function onCheck(row: Row) {
    if (row.advancing) return;
    const previous = rows;
    // Optimistic: tick the progress up and flag the card as advancing. Only a
    // show with no aired episodes left leaves the list — otherwise it stays
    // put and swaps to the next episode when the refresh lands.
    setRows((prev) =>
      prev.flatMap((r) => {
        if (r.show_id !== row.show_id) return [r];
        const watched = r.watched_count + 1;
        if (watched >= r.aired_count) return [];
        return [{ ...r, watched_count: watched, advancing: true }];
      }),
    );
    startTransition(async () => {
      const res = await markWatched({
        showId: row.show_id,
        showTmdbId: row.show_tmdb_id,
        mode: "unitary",
        episodeId: row.episode_id,
      });
      if (!res.ok) {
        setRows(previous);
        toast.error(res.error);
        return;
      }
      toast.success(
        `${row.show_name} ${formatEpisodeCode(row.season_number, row.episode_number)} watched`,
        {
          action: {
            label: "Undo",
            onClick: () => {
              void unmarkWatched({
                episodeId: row.episode_id,
                showTmdbId: row.show_tmdb_id,
              }).then((undo) => {
                if (undo.ok) router.refresh();
                else toast.error(undo.error);
              });
            },
          },
        },
      );
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="You're all caught up"
        description="No unwatched episodes right now. Find something new to follow."
        actionLabel="Explore shows"
        actionHref="/explore"
      />
    );
  }

  const [hero, ...rest] = rows;
  if (!hero) return null; // unreachable: rows is non-empty past the guard above

  return (
    <div className="flex flex-col gap-6">
      <HeroCard row={hero} onCheck={onCheck} />
      {rest.length > 0 ? (
        <section aria-labelledby="watch-next-queue-heading">
          <div className="mb-3 flex items-baseline gap-2">
            <h2
              id="watch-next-queue-heading"
              className="text-base font-semibold"
            >
              Then keep going
            </h2>
            <span className="text-xs text-muted-foreground">
              {rest.length} more show{rest.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="flex gap-3 overflow-x-auto pb-2">
            {rest.map((row) => (
              <RailCard key={row.show_id} row={row} onCheck={onCheck} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function progressOf(row: WatchNextRow) {
  return row.aired_count > 0 ? (row.watched_count / row.aired_count) * 100 : 0;
}

function episodeLine(row: Row) {
  if (row.advancing) return "Lining up the next episode…";
  return (
    formatEpisodeCode(row.season_number, row.episode_number) +
    (row.episode_name ? ` · ${row.episode_name}` : "") +
    (row.episode_air_date ? ` · ${formatAirDate(row.episode_air_date)}` : "")
  );
}

function ProgressBar({ row, className }: { row: WatchNextRow; className?: string }) {
  const progress = progressOf(row);
  return (
    <div
      className={className ?? "h-1.5 flex-1 overflow-hidden rounded-full bg-muted"}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${row.watched_count} of ${row.aired_count} episodes watched`}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function HeroCard({
  row,
  onCheck,
}: {
  row: Row;
  onCheck: (row: Row) => void;
}) {
  const backdrop = backdropUrl(row.backdrop_path, "w780");
  const poster = posterUrl(row.poster_path, "w154");
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card">
      <Link
        href={`/shows/${row.show_tmdb_id}`}
        className="relative block aspect-video bg-muted sm:aspect-[21/9]"
        aria-label={row.show_name}
      >
        {backdrop ? (
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : poster ? (
          <Image src={poster} alt="" fill className="object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary drop-shadow">
            Up next
          </p>
          <p className="text-xl font-bold drop-shadow sm:text-2xl">
            {row.show_name}
          </p>
          <p className="mt-0.5 text-sm text-white/85 drop-shadow">
            {episodeLine(row)}
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-3 p-3 sm:px-4">
        <ProgressBar row={row} />
        <span className="text-xs tabular-nums text-muted-foreground">
          {row.watched_count}/{row.aired_count}
        </span>
        <Button
          className="rounded-full"
          disabled={row.advancing}
          aria-label={`Mark ${row.show_name} ${formatEpisodeCode(row.season_number, row.episode_number)} as watched`}
          onClick={() => onCheck(row)}
        >
          <Check data-icon="inline-start" aria-hidden /> Watched
        </Button>
      </div>
    </div>
  );
}

function RailCard({
  row,
  onCheck,
}: {
  row: Row;
  onCheck: (row: Row) => void;
}) {
  const backdrop = backdropUrl(row.backdrop_path, "w780");
  const poster = posterUrl(row.poster_path, "w154");
  return (
    <li className="group w-56 shrink-0 overflow-hidden rounded-xl border bg-card sm:w-64">
      <Link
        href={`/shows/${row.show_tmdb_id}`}
        className="relative block aspect-video bg-muted"
        aria-label={row.show_name}
      >
        {backdrop ? (
          <Image
            src={backdrop}
            alt=""
            fill
            sizes="256px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : poster ? (
          <Image src={poster} alt="" fill className="object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-2.5 text-white">
          <p className="truncate text-sm font-semibold drop-shadow">
            {row.show_name}
          </p>
          <p className="truncate text-xs text-white/85 drop-shadow">
            {row.advancing
              ? "Lining up the next episode…"
              : formatEpisodeCode(row.season_number, row.episode_number) +
                (row.episode_name ? ` · ${row.episode_name}` : "")}
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2.5 p-2.5">
        <ProgressBar row={row} />
        <span className="text-xs tabular-nums text-muted-foreground">
          {row.watched_count}/{row.aired_count}
        </span>
        <Button
          size="icon"
          variant="outline"
          className="size-8 rounded-full"
          disabled={row.advancing}
          aria-label={`Mark ${row.show_name} ${formatEpisodeCode(row.season_number, row.episode_number)} as watched`}
          onClick={() => onCheck(row)}
        >
          <Check className="size-4" aria-hidden />
        </Button>
      </div>
    </li>
  );
}
