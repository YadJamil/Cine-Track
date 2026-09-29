"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/lib/supabase/database.types";
import { deleteReview, upsertReview } from "../actions";
import type { ReviewWithAuthor } from "../queries";

export function ReviewSection({
  reviews,
  average,
  mediaType,
  showId,
  movieId,
  viewerId,
  revalidate,
}: {
  reviews: ReviewWithAuthor[];
  average: number | null;
  mediaType: MediaType;
  showId?: number;
  movieId?: number;
  viewerId: string | null;
  revalidate: string;
}) {
  const own = reviews.find((r) => r.userId === viewerId) ?? null;

  return (
    <section aria-label="Reviews" className="flex flex-col gap-4">
      {average !== null ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Star className="size-4 fill-primary text-primary" aria-hidden />
          <span className="font-semibold text-foreground">{average}</span>/10
          from {reviews.length} review{reviews.length === 1 ? "" : "s"}
        </p>
      ) : null}
      {viewerId ? (
        <ReviewForm
          mediaType={mediaType}
          showId={showId}
          movieId={movieId}
          own={own}
          revalidate={revalidate}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4">
            Log in
          </Link>{" "}
          to write a review.
        </p>
      )}
      {reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Rate it and tell everyone what you think."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {reviews.map((r) => (
            <ReviewItem
              key={r.id}
              review={r}
              viewerId={viewerId}
              revalidate={revalidate}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Rating out of 10"
      className="flex items-center gap-0.5"
    >
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} out of 10`}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            className={cn(
              "size-5 transition-colors",
              n <= value
                ? "fill-primary text-primary"
                : "text-muted-foreground",
            )}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({
  mediaType,
  showId,
  movieId,
  own,
  revalidate,
}: {
  mediaType: MediaType;
  showId?: number;
  movieId?: number;
  own: ReviewWithAuthor | null;
  revalidate: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(own?.rating ?? 0);
  const [body, setBody] = useState(own?.body ?? "");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Pick a rating first.");
      return;
    }
    startTransition(async () => {
      const res = await upsertReview({
        mediaType,
        showId,
        movieId,
        rating,
        body,
        revalidate,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(own ? "Review updated" : "Review posted");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-xl border p-3"
    >
      <p className="text-sm font-medium">
        {own ? "Your review" : "Rate & review"}
      </p>
      <StarRating value={rating} onChange={setRating} />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did you think? (optional)"
        maxLength={5000}
        rows={3}
        aria-label="Review text"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || rating < 1}>
          {pending ? "Saving…" : own ? "Update review" : "Post review"}
        </Button>
      </div>
    </form>
  );
}

function ReviewItem({
  review,
  viewerId,
  revalidate,
}: {
  review: ReviewWithAuthor;
  viewerId: string | null;
  revalidate: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      const res = await deleteReview({ reviewId: review.id, revalidate });
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <li className="flex gap-3">
      <Link href={`/profile/${review.username}`} className="shrink-0">
        <UserAvatar
          username={review.username}
          displayName={review.displayName}
          avatarUrl={review.avatarUrl}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <Link
            href={`/profile/${review.username}`}
            className="font-medium hover:underline"
          >
            {review.displayName || review.username}
          </Link>
          <span className="flex items-center gap-1 text-xs">
            <Star className="size-3 fill-primary text-primary" aria-hidden />
            {review.rating}/10
          </span>
          <time
            dateTime={review.createdAt}
            className="text-xs text-muted-foreground"
          >
            {relativeTime(review.createdAt)}
          </time>
        </p>
        {review.body ? (
          <p className="whitespace-pre-wrap break-words text-sm">
            {review.body}
          </p>
        ) : null}
        {viewerId === review.userId ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete review"
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" aria-hidden /> Delete
          </button>
        ) : null}
      </div>
    </li>
  );
}
