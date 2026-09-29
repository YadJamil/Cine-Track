"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ReactionType } from "@/lib/supabase/database.types";
import { setEpisodeReaction } from "../actions";

// [ASSUMPTION A6] TV Time's six episode emotions
const REACTIONS: { key: ReactionType; emoji: string; label: string }[] = [
  { key: "good", emoji: "👍", label: "Good" },
  { key: "fun", emoji: "😂", label: "Fun" },
  { key: "wow", emoji: "🤯", label: "Wow" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "soso", emoji: "😐", label: "So-so" },
  { key: "bad", emoji: "👎", label: "Bad" },
];

export function ReactionPicker({
  episodeId,
  counts,
  own,
  viewerId,
  revalidate,
}: {
  episodeId: number;
  counts: Partial<Record<ReactionType, number>>;
  own: ReactionType | null;
  viewerId: string | null;
  revalidate: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<ReactionType | null>(own);
  const [localCounts, setLocalCounts] = useState(counts);
  const [, startTransition] = useTransition();

  function pick(reaction: ReactionType) {
    if (!viewerId) {
      toast.error("Log in to react.");
      return;
    }
    const previous = current;
    const next = current === reaction ? null : reaction;
    setCurrent(next);
    setLocalCounts((c) => {
      const copy = { ...c };
      if (previous) copy[previous] = Math.max(0, (copy[previous] ?? 1) - 1);
      if (next) copy[next] = (copy[next] ?? 0) + 1;
      return copy;
    });
    startTransition(async () => {
      const res = await setEpisodeReaction({
        episodeId,
        reaction: next,
        revalidate,
      });
      if (!res.ok) {
        setCurrent(previous);
        setLocalCounts(counts);
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label="How was this episode?"
      className="flex flex-wrap gap-2"
    >
      {REACTIONS.map((r) => {
        const active = current === r.key;
        const count = localCounts[r.key] ?? 0;
        return (
          <button
            key={r.key}
            type="button"
            onClick={() => pick(r.key)}
            aria-pressed={active}
            aria-label={`${r.label}${count > 0 ? `, ${count}` : ""}`}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              active
                ? "border-primary bg-primary/15"
                : "hover:bg-accent",
            )}
          >
            <span aria-hidden>{r.emoji}</span>
            <span className="text-xs">{r.label}</span>
            {count > 0 ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
