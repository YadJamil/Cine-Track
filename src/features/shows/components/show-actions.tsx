"use client";

import { useTransition } from "react";
import { Archive, Bookmark, Heart, ImageIcon, Plus, Check, CheckSquare, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOptimisticToggle } from "@/hooks/use-optimistic-toggle";
import { setCoverFromShow } from "@/features/profile/actions";
import { cn } from "@/lib/utils";
import { setShowFlag, setWatchlist, markWatched } from "@/features/tracking/actions";
import type { Bucket } from "@/lib/supabase/database.types";

type Flags = {
  is_followed: boolean;
  is_favorited: boolean;
  is_for_later: boolean;
  is_archived: boolean;
};

export function ShowActions({
  showId,
  showTmdbId,
  flags,
  bucket,
  signedIn,
  watchedCount = 0,
  airedCount = 0,
}: {
  showId: number;
  showTmdbId: number;
  flags: Flags | null;
  /** Viewer's tracking bucket; drives the watchlist button's state. */
  bucket: Bucket | null;
  signedIn: boolean;
  watchedCount?: number;
  airedCount?: number;
}) {
  const [pending, startTransition] = useTransition();

  const inWatchlist = useOptimisticToggle(bucket === "watchlist", (next) =>
    setWatchlist({ showId, showTmdbId, value: next }),
  );
  
  const inWatchLater = useOptimisticToggle(bucket === "watch_later", (next) =>
    setWatchlist({ showId, showTmdbId, value: next }),
  );

  const favorited = useOptimisticToggle(flags?.is_favorited ?? false, (next) =>
    setShowFlag({ showId, showTmdbId, flag: "is_favorited", value: next }),
  );
  const archived = useOptimisticToggle(flags?.is_archived ?? false, (next) =>
    setShowFlag({ showId, showTmdbId, flag: "is_archived", value: next }),
  );

  function requireLogin() {
    toast.error("Log in to track shows.");
  }

  function onSetCover() {
    if (!signedIn) return requireLogin();
    startTransition(async () => {
      const res = await setCoverFromShow({ showId, showTmdbId });
      if (!res.ok) toast.error(res.error);
      else toast.success("Profile cover updated");
    });
  }

  function onMarkShowWatched() {
    if (!signedIn) return requireLogin();
    startTransition(async () => {
      const res = await markWatched({ showId, showTmdbId, mode: "show" });
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Entire show marked as watched");
      }
    });
  }

  const isWatchlistMode = watchedCount === 0;
  const isWatchLaterMode = watchedCount > 0 && watchedCount < airedCount;
  const isCompletedMode = airedCount > 0 && watchedCount === airedCount;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isWatchlistMode && (
        <Button
          size="sm"
          variant={inWatchlist.value ? "secondary" : "default"}
          onClick={signedIn ? inWatchlist.toggle : requireLogin}
          aria-pressed={inWatchlist.value}
          className={cn(
            "cursor-pointer select-none transition-all active:scale-95",
            inWatchlist.value && "border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/10"
          )}
        >
          {inWatchlist.value ? (
            <>
              <Bookmark
                data-icon="inline-start"
                className="fill-current"
                aria-hidden
              />{" "}
              In watchlist
            </>
          ) : (
            <>
              <Plus data-icon="inline-start" aria-hidden /> Add to watchlist
            </>
          )}
        </Button>
      )}

      {isWatchLaterMode && (
        <Button
          size="sm"
          variant={inWatchLater.value ? "secondary" : "default"}
          onClick={signedIn ? inWatchLater.toggle : requireLogin}
          aria-pressed={inWatchLater.value}
          className={cn(
            "cursor-pointer select-none transition-all active:scale-95",
            inWatchLater.value && "border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/10"
          )}
        >
          {inWatchLater.value ? (
            <>
              <Clock
                data-icon="inline-start"
                className="size-4 shrink-0"
                aria-hidden
              />{" "}
              In watch later
            </>
          ) : (
            <>
              <Clock data-icon="inline-start" className="size-4 shrink-0" aria-hidden /> Add to watch later
            </>
          )}
        </Button>
      )}

      {isCompletedMode && (
        <Button
          size="sm"
          variant="outline"
          disabled
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default hover:bg-emerald-500/10"
        >
          <Check className="size-4 shrink-0" data-icon="inline-start" aria-hidden />
          Watched
        </Button>
      )}

      {airedCount > 0 && !isCompletedMode ? (
        <Button
          size="sm"
          variant="default"
          onClick={signedIn ? onMarkShowWatched : requireLogin}
          disabled={pending}
          className="cursor-pointer select-none transition-all active:scale-95"
        >
          <CheckSquare className="size-4 shrink-0" data-icon="inline-start" aria-hidden />
          Mark all as seen
        </Button>
      ) : null}

      <Button
        size="sm"
        variant={archived.value ? "secondary" : "outline"}
        onClick={signedIn ? archived.toggle : requireLogin}
        aria-pressed={archived.value}
        title={archived.value ? "Tap to resume watching" : undefined}
        className={cn(
          "cursor-pointer select-none transition-all active:scale-95",
          archived.value &&
            "border-primary/30 bg-primary/10 text-primary hover:bg-primary/10",
        )}
      >
        <Archive data-icon="inline-start" aria-hidden />
        {archived.value ? "Stopped" : "Stop watching"}
      </Button>

      <div className="inline-flex items-center gap-0.5 rounded-full border bg-card/50 p-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={signedIn ? favorited.toggle : requireLogin}
                aria-pressed={favorited.value}
                aria-label={
                  favorited.value
                    ? "Remove from favorites"
                    : "Add to favorites"
                }
              >
                <Heart
                  className={cn(
                    favorited.value && "fill-red-500 text-red-500",
                  )}
                  aria-hidden
                />
              </Button>
            }
          />
          <TooltipContent>Favorite</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={onSetCover}
                aria-label="Use artwork as profile cover"
              >
                <ImageIcon aria-hidden />
              </Button>
            }
          />
          <TooltipContent>Set as profile cover</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
