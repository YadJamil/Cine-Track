"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/format";
import { useOptimisticToggle } from "@/hooks/use-optimistic-toggle";
import { setMovieWatched } from "../actions";

export function MovieWatchButton({
  movieId,
  movieTmdbId,
  watched,
  watchedAt,
  signedIn,
}: {
  movieId: number;
  movieTmdbId: string;
  watched: boolean;
  watchedAt: string | null;
  signedIn: boolean;
}) {
  const router = useRouter();
  const toggle = useOptimisticToggle(watched, async (next) => {
    const res = await setMovieWatched({ movieId, movieTmdbId, watched: next });
    if (res.ok) router.refresh();
    return res;
  });

  return (
    <div className="flex items-center gap-3">
      <Button
        size="lg"
        variant={toggle.value ? "secondary" : "default"}
        onClick={() => {
          if (!signedIn) {
            toast.error("Log in to track movies.");
            return;
          }
          toggle.toggle();
        }}
        aria-pressed={toggle.value}
      >
        <Check data-icon="inline-start" aria-hidden />
        {toggle.value ? "Watched" : "Mark as watched"}
      </Button>
      {toggle.value && watchedAt ? (
        <span className="text-xs text-muted-foreground">
          watched {relativeTime(watchedAt)}
        </span>
      ) : null}
    </div>
  );
}
