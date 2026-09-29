import type { Bucket } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for how a tracking bucket is labelled and coloured.
 * Buckets are derived in `v_user_show_progress` — see the completed_bucket
 * migration. Every surface (tabs, filters, show page, posters) reads from here so
 * a label or colour only ever changes in one place.
 *
 * The two "you're caught up" states carry the meaningful colours:
 *   completed  🟣 finished for good (Ended, nothing upcoming)
 *   up_to_date 🟢 caught up, but more is coming
 */
type BucketMeta = {
  label: string;
  /** Short hint used where there is room to explain the difference. */
  hint: string;
  dot: string;
  badge: string;
};

export const BUCKET_META: Record<Bucket, BucketMeta> = {
  watching: {
    label: "Watching",
    hint: "Episodes still to catch up on",
    dot: "bg-primary",
    badge: "border-primary/40 bg-primary/10 text-primary",
  },
  up_to_date: {
    label: "Up to date",
    hint: "Caught up — more episodes are coming",
    dot: "bg-emerald-500",
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  },
  completed: {
    label: "Completed",
    hint: "Finished — the show has ended",
    dot: "bg-purple-500",
    badge: "border-purple-500/40 bg-purple-500/10 text-purple-400",
  },
  watchlist: {
    label: "Watchlist",
    hint: "Lined up to watch — you haven't started it yet",
    dot: "bg-sky-500",
    badge: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  },
  watch_later: {
    label: "Watch later",
    hint: "Saved to watch later",
    dot: "bg-orange-500",
    badge: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  },
  stopped: {
    label: "Stopped",
    hint: "Archived — no longer tracking",
    dot: "bg-zinc-600",
    badge: "border-zinc-600/40 bg-zinc-600/10 text-zinc-400",
  },
};

/** Display order for tabs and filters — follows the watch lifecycle. */
export const BUCKET_ORDER: Bucket[] = [
  "watching",
  "up_to_date",
  "completed",
  "watchlist",
  "watch_later",
  "stopped",
];

/** Buckets worth calling out on a poster; the rest are implied by the grid. */
const POSTER_BUCKETS: Bucket[] = ["completed", "up_to_date"];

export function isBucket(value: string | null | undefined): value is Bucket {
  return !!value && value in BUCKET_META;
}

/** Bare coloured dot — pair it with a label. */
export function StatusDot({
  bucket,
  className,
}: {
  bucket: Bucket;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        BUCKET_META[bucket].dot,
        className,
      )}
    />
  );
}

/** Dot + label pill. Used on the show page and anywhere status needs naming. */
export function ShowStatusBadge({
  bucket,
  className,
}: {
  bucket: Bucket;
  className?: string;
}) {
  const meta = BUCKET_META[bucket];
  return (
    <span
      title={meta.hint}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        meta.badge,
        className,
      )}
    >
      <StatusDot bucket={bucket} />
      {meta.label}
    </span>
  );
}

/**
 * Corner dot for poster grids — only for the two "caught up" states, so the grid
 * stays quiet for shows that are simply in progress.
 */
export function PosterStatusDot({ bucket }: { bucket: Bucket }) {
  if (!POSTER_BUCKETS.includes(bucket)) return null;
  const meta = BUCKET_META[bucket];
  return (
    <span
      title={meta.label}
      className={cn(
        "absolute top-1.5 right-1.5 size-2.5 rounded-full ring-2 ring-black/50",
        meta.dot,
      )}
    >
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}
