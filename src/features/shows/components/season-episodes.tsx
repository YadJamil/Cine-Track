"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { daysUntil, formatAirDate, formatEpisodeCode } from "@/lib/format";
import { stillUrl } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";
import { markWatched, unmarkWatched } from "@/features/tracking/actions";
import type { EpisodeItem } from "../queries";

type PromptState =
  | { kind: "fill_previous"; episode: EpisodeItem }
  | { kind: "unknown_air_date"; episode: EpisodeItem }
  | null;

export function SeasonEpisodes({
  episodes,
  showId,
  showTmdbId,
  signedIn,
}: {
  episodes: EpisodeItem[];
  showId: number;
  showTmdbId: number;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [optimistic, setOptimistic] = useState<Map<number, boolean>>(new Map());
  const [pending, startTransition] = useTransition();

  function isWatched(e: EpisodeItem) {
    return optimistic.get(e.id) ?? e.watched;
  }

  function run(episode: EpisodeItem, mode: "unitary" | "fill_previous") {
    setPrompt(null);
    setOptimistic((m) => new Map(m).set(episode.id, true));
    startTransition(async () => {
      const res = await markWatched({
        showId,
        showTmdbId,
        mode,
        episodeId: episode.id,
      });
      if (!res.ok) {
        setOptimistic((m) => new Map(m).set(episode.id, false));
        toast.error(res.error);
        return;
      }
      toast.success(
        mode === "fill_previous"
          ? `${res.data.inserted} episodes marked as watched`
          : `${formatEpisodeCode(episode.seasonNumber, episode.episodeNumber)} watched`,
        {
          action: {
            label: "Undo",
            onClick: () => {
              void unmarkWatched({ episodeId: episode.id, showTmdbId }).then(
                () => router.refresh(),
              );
            },
          },
        },
      );
      router.refresh();
    });
  }

  function onToggle(episode: EpisodeItem) {
    if (!signedIn) {
      toast.error("Log in to track episodes.");
      return;
    }
    if (isWatched(episode)) {
      setOptimistic((m) => new Map(m).set(episode.id, false));
      startTransition(async () => {
        const res = await unmarkWatched({ episodeId: episode.id, showTmdbId });
        if (!res.ok) {
          setOptimistic((m) => new Map(m).set(episode.id, true));
          toast.error(res.error);
          return;
        }
        router.refresh();
      });
      return;
    }
    if (episode.airDate === null) {
      setPrompt({ kind: "unknown_air_date", episode });
      return;
    }
    if (episode.earlierUnwatched > 0) {
      setPrompt({ kind: "fill_previous", episode });
      return;
    }
    run(episode, "unitary");
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <ul className="flex flex-col gap-1.5">
        {episodes.map((e) => {
          const aired = e.airDate !== null && e.airDate <= today;
          const watched = isWatched(e);
          const still = stillUrl(e.stillPath, "w185");
          const code = formatEpisodeCode(e.seasonNumber, e.episodeNumber);
          return (
            <li
              key={e.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-2 transition-colors",
                watched ? "border-transparent bg-muted/30" : "border-border",
              )}
            >
              <Link
                href={`/episodes/${e.id}`}
                className={cn(
                  "relative block h-14 w-24 shrink-0 overflow-hidden rounded bg-muted",
                  watched && "opacity-60",
                )}
                aria-hidden
                tabIndex={-1}
              >
                {still ? (
                  <Image
                    src={still}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : null}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/episodes/${e.id}`}
                  className="line-clamp-1 text-sm font-medium hover:underline"
                >
                  {code}
                  {e.name ? ` · ${e.name}` : ""}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {formatAirDate(e.airDate)}
                  {e.runtime ? ` · ${e.runtime}m` : ""}
                </p>
              </div>
              {aired || e.airDate === null ? (
                <Button
                  size="icon-sm"
                  variant={watched ? "default" : "outline"}
                  className="rounded-full"
                  disabled={pending}
                  onClick={() => onToggle(e)}
                  aria-pressed={watched}
                  aria-label={
                    watched
                      ? `Unmark ${code} as watched`
                      : `Mark ${code} as watched`
                  }
                >
                  <Check aria-hidden />
                </Button>
              ) : (
                <span
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                  title={`Airs ${formatAirDate(e.airDate)}`}
                >
                  <Hourglass className="size-3.5" aria-hidden />
                  {daysUntil(e.airDate as string)}d
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog
        open={prompt !== null}
        onOpenChange={(open) => {
          if (!open) setPrompt(null);
        }}
      >
        <DialogContent className="max-w-sm">
          {prompt?.kind === "fill_previous" ? (
            <>
              <DialogHeader>
                <DialogTitle>Catch up to here?</DialogTitle>
                <DialogDescription>
                  {prompt.episode.earlierUnwatched} earlier episode
                  {prompt.episode.earlierUnwatched === 1 ? "" : "s"} are
                  unwatched. Mark them as watched too?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className={cn("gap-2 sm:gap-2")}>
                <Button
                  variant="outline"
                  onClick={() => run(prompt.episode, "unitary")}
                >
                  Just this one
                </Button>
                <Button onClick={() => run(prompt.episode, "fill_previous")}>
                  Mark {prompt.episode.earlierUnwatched + 1} episodes
                </Button>
              </DialogFooter>
            </>
          ) : prompt?.kind === "unknown_air_date" ? (
            <>
              <DialogHeader>
                <DialogTitle>No air date yet</DialogTitle>
                <DialogDescription>
                  This episode has no confirmed air date. Mark it as watched
                  anyway?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className={cn("gap-2 sm:gap-2")}>
                <Button variant="outline" onClick={() => setPrompt(null)}>
                  Cancel
                </Button>
                <Button onClick={() => run(prompt.episode, "unitary")}>
                  Mark watched
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MarkSeasonButton({
  showId,
  showTmdbId,
  seasonNumber,
  remaining,
  signedIn,
}: {
  showId: number;
  showTmdbId: number;
  seasonNumber: number;
  remaining: number;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (remaining === 0) return null;

  function onClick() {
    if (!signedIn) {
      toast.error("Log in to track episodes.");
      return;
    }
    startTransition(async () => {
      const res = await markWatched({
        showId,
        showTmdbId,
        mode: "season",
        seasonNumber,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.data.inserted} episodes marked as watched`);
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant="secondary" onClick={onClick} disabled={pending}>
      <Check data-icon="inline-start" aria-hidden />
      {pending ? "Marking…" : `Mark season watched (${remaining})`}
    </Button>
  );
}
