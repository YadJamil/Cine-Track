"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
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
import { relativeTime } from "@/lib/format";
import { markWatched, unmarkWatched } from "../actions";

export function EpisodeWatchButton({
  showId,
  showTmdbId,
  episodeId,
  watched: initialWatched,
  watchedAt,
  earlierUnwatched,
  unknownAirDate,
  signedIn,
}: {
  showId: number;
  showTmdbId: number;
  episodeId: number;
  watched: boolean;
  watchedAt: string | null;
  earlierUnwatched: number;
  unknownAirDate: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [watched, setWatched] = useState(initialWatched);
  const [prompt, setPrompt] = useState<"fill" | "unknown" | null>(null);
  const [pending, startTransition] = useTransition();

  function run(mode: "unitary" | "fill_previous") {
    setPrompt(null);
    setWatched(true);
    startTransition(async () => {
      const res = await markWatched({ showId, showTmdbId, mode, episodeId });
      if (!res.ok) {
        setWatched(false);
        toast.error(res.error);
        return;
      }
      toast.success(
        mode === "fill_previous"
          ? `${res.data.inserted} episodes marked as watched`
          : "Marked as watched",
        {
          action: {
            label: "Undo",
            onClick: () => {
              void unmarkWatched({ episodeId, showTmdbId }).then(() =>
                router.refresh(),
              );
            },
          },
        },
      );
      router.refresh();
    });
  }

  function onClick() {
    if (!signedIn) {
      toast.error("Log in to track episodes.");
      return;
    }
    if (watched) {
      setWatched(false);
      startTransition(async () => {
        const res = await unmarkWatched({ episodeId, showTmdbId });
        if (!res.ok) {
          setWatched(true);
          toast.error(res.error);
          return;
        }
        router.refresh();
      });
      return;
    }
    if (unknownAirDate) {
      setPrompt("unknown");
      return;
    }
    if (earlierUnwatched > 0) {
      setPrompt("fill");
      return;
    }
    run("unitary");
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Button
          size="lg"
          variant={watched ? "secondary" : "default"}
          onClick={onClick}
          disabled={pending}
          aria-pressed={watched}
        >
          <Check data-icon="inline-start" aria-hidden />
          {watched ? "Watched" : "Mark as watched"}
        </Button>
        {watched && watchedAt ? (
          <span className="text-xs text-muted-foreground">
            watched {relativeTime(watchedAt)}
          </span>
        ) : null}
      </div>

      <Dialog
        open={prompt !== null}
        onOpenChange={(open) => {
          if (!open) setPrompt(null);
        }}
      >
        <DialogContent className="max-w-sm">
          {prompt === "fill" ? (
            <>
              <DialogHeader>
                <DialogTitle>Catch up to here?</DialogTitle>
                <DialogDescription>
                  {earlierUnwatched} earlier episode
                  {earlierUnwatched === 1 ? "" : "s"} are unwatched. Mark them
                  as watched too?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => run("unitary")}>
                  Just this one
                </Button>
                <Button onClick={() => run("fill_previous")}>
                  Mark {earlierUnwatched + 1} episodes
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>No air date yet</DialogTitle>
                <DialogDescription>
                  This episode has no confirmed air date. Mark it as watched
                  anyway?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setPrompt(null)}>
                  Cancel
                </Button>
                <Button onClick={() => run("unitary")}>Mark watched</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
