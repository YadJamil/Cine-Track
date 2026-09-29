"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, Heart, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { relativeTime } from "@/lib/format";
import { useOptimisticToggle } from "@/hooks/use-optimistic-toggle";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/lib/supabase/database.types";
import { addComment, deleteComment, setCommentLike } from "../actions";
import type { CommentWithMeta } from "../queries";

type Target = {
  mediaType: MediaType;
  showId?: number;
  episodeId?: number;
  movieId?: number;
};

export function CommentSection({
  comments,
  target,
  viewerId,
  revalidate,
}: {
  comments: CommentWithMeta[];
  target: Target;
  viewerId: string | null;
  revalidate: string;
}) {
  return (
    <section aria-label="Comments" className="flex flex-col gap-4">
      {viewerId ? (
        <CommentForm target={target} revalidate={revalidate} />
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4">
            Log in
          </Link>{" "}
          to join the conversation.
        </p>
      )}
      {comments.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No comments yet"
          description="Be the first to say something."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              viewerId={viewerId}
              revalidate={revalidate}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentForm({
  target,
  revalidate,
}: {
  target: Target;
  revalidate: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await addComment({
        mediaType: target.mediaType,
        showId: target.showId,
        episodeId: target.episodeId,
        movieId: target.movieId,
        body,
        containsSpoiler: spoiler,
        revalidate,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setBody("");
      setSpoiler(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share your thoughts…"
        maxLength={2000}
        rows={3}
        aria-label="Write a comment"
        required
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={spoiler}
            onCheckedChange={(v) => setSpoiler(v === true)}
          />
          Contains spoilers
        </label>
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? "Posting…" : "Post comment"}
        </Button>
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  viewerId,
  revalidate,
}: {
  comment: CommentWithMeta;
  viewerId: string | null;
  revalidate: string;
}) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [, startTransition] = useTransition();

  const like = useOptimisticToggle(comment.likedByViewer, async (next) => {
    setLikeCount((n) => n + (next ? 1 : -1));
    const res = await setCommentLike({ commentId: comment.id, liked: next });
    if (!res.ok) setLikeCount((n) => n + (next ? -1 : 1));
    return res;
  });

  const blurred = comment.containsSpoiler && !revealed;

  function onDelete() {
    startTransition(async () => {
      const res = await deleteComment({ commentId: comment.id, revalidate });
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <li className="flex gap-3">
      <Link href={`/profile/${comment.username}`} className="shrink-0">
        <UserAvatar
          username={comment.username}
          displayName={comment.displayName}
          avatarUrl={comment.avatarUrl}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2 text-sm">
          <Link
            href={`/profile/${comment.username}`}
            className="font-medium hover:underline"
          >
            {comment.displayName || comment.username}
          </Link>
          <time
            dateTime={comment.createdAt}
            className="text-xs text-muted-foreground"
          >
            {relativeTime(comment.createdAt)}
          </time>
        </p>
        <div className="relative">
          <p
            className={cn(
              "whitespace-pre-wrap break-words text-sm",
              blurred && "select-none blur-sm",
            )}
            aria-hidden={blurred}
          >
            {comment.body}
          </p>
          {blurred ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-medium"
            >
              <Eye className="size-3.5" aria-hidden /> Spoiler — tap to reveal
            </button>
          ) : null}
        </div>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (!viewerId) {
                toast.error("Log in to like comments.");
                return;
              }
              like.toggle();
            }}
            aria-pressed={like.value}
            aria-label={like.value ? "Unlike comment" : "Like comment"}
            className={cn(
              "flex items-center gap-1 text-xs",
              like.value ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Heart
              className={cn("size-3.5", like.value && "fill-current")}
              aria-hidden
            />
            {likeCount > 0 ? likeCount : null}
          </button>
          {viewerId === comment.userId ? (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete comment"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
