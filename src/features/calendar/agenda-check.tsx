"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markWatched, unmarkWatched } from "@/features/tracking/actions";

export function AgendaCheck({
  showId,
  showTmdbId,
  episodeId,
  watched: initialWatched,
  label,
}: {
  showId: number;
  showTmdbId: number;
  episodeId: number;
  watched: boolean;
  label: string;
}) {
  const router = useRouter();
  const [watched, setWatched] = useState(initialWatched);
  const [pending, startTransition] = useTransition();

  function onClick() {
    const next = !watched;
    setWatched(next);
    startTransition(async () => {
      const res = next
        ? await markWatched({
            showId,
            showTmdbId,
            mode: "unitary",
            episodeId,
          })
        : await unmarkWatched({ episodeId, showTmdbId });
      if (!res.ok) {
        setWatched(!next);
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button
      size="icon-sm"
      variant={watched ? "default" : "outline"}
      className="rounded-full"
      onClick={onClick}
      disabled={pending}
      aria-pressed={watched}
      aria-label={watched ? `Unmark ${label}` : `Mark ${label} as watched`}
    >
      <Check aria-hidden />
    </Button>
  );
}
