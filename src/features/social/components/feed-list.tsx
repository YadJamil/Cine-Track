"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Award, Star, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { relativeTime } from "@/lib/format";
import { posterUrl } from "@/lib/tmdb/images";
import { fetchFeedPage, type FeedEvent } from "../feed";

const watchPayload = z.object({
  show_tmdb_id: z.number(),
  show_name: z.string(),
  poster_path: z.string().nullable(),
  episode_count: z.number(),
});
const movieWatchPayload = z.object({
  source_id: z.string(),
  title: z.string(),
  poster_path: z.string().nullable(),
});
const followPayload = z.object({
  followee_username: z.string(),
  followee_display_name: z.string().nullable(),
});
const reviewPayload = z.object({
  media_type: z.enum(["show", "movie"]),
  rating: z.number(),
  body: z.string().nullable(),
  // external id is text now (TVmaze int-as-text for shows, IMDb id for movies)
  tmdb_id: z.string().nullable(),
  title: z.string().nullable(),
  poster_path: z.string().nullable(),
});
const badgePayload = z.object({
  badge_name: z.string(),
});

export function FeedList({ initial }: { initial: FeedEvent[] }) {
  const [events, setEvents] = useState(initial);
  const [exhausted, setExhausted] = useState(initial.length < 30);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    const before = events[events.length - 1]?.created_at ?? null;
    startTransition(async () => {
      const res = await fetchFeedPage({ before });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setEvents((prev) => [...prev, ...res.data]);
      if (res.data.length < 30) setExhausted(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {events.map((e, i) => (
          <FeedItem
            key={`${e.event_type}-${e.actor_id}-${e.created_at}-${i}`}
            event={e}
          />
        ))}
      </ul>
      {!exhausted ? (
        <Button
          variant="outline"
          onClick={loadMore}
          disabled={pending}
          className="self-center"
        >
          {pending ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}

function FeedItem({ event }: { event: FeedEvent }) {
  const actorName = event.actor_display_name || event.actor_username;
  const head = (
    <span>
      <Link
        href={`/profile/${event.actor_username}`}
        className="font-medium hover:underline"
      >
        {actorName}
      </Link>{" "}
    </span>
  );

  let body: React.ReactNode = null;
  let art: React.ReactNode = (
    <UserAvatar
      username={event.actor_username}
      displayName={event.actor_display_name}
      avatarUrl={event.actor_avatar_url}
      className="size-10"
    />
  );

  if (event.event_type === "watch") {
    const p = watchPayload.safeParse(event.payload);
    if (!p.success) return null;
    const poster = posterUrl(p.data.poster_path, "w154");
    body = (
      <>
        {head}
        watched{" "}
        {p.data.episode_count > 1 ? (
          <strong>{p.data.episode_count} episodes</strong>
        ) : (
          "an episode"
        )}{" "}
        of{" "}
        <Link
          href={`/shows/${p.data.show_tmdb_id}`}
          className="font-medium hover:underline"
        >
          {p.data.show_name}
        </Link>
      </>
    );
    if (poster) {
      art = (
        <Link
          href={`/shows/${p.data.show_tmdb_id}`}
          className="relative block h-14 w-10 shrink-0 overflow-hidden rounded bg-muted"
          tabIndex={-1}
          aria-hidden
        >
          <Image src={poster} alt="" fill sizes="40px" className="object-cover" />
        </Link>
      );
    }
  } else if (event.event_type === "movie_watch") {
    const p = movieWatchPayload.safeParse(event.payload);
    if (!p.success) return null;
    const poster = posterUrl(p.data.poster_path, "w154");
    body = (
      <>
        {head}
        watched{" "}
        <Link
          href={`/movies/${p.data.source_id}`}
          className="font-medium hover:underline"
        >
          {p.data.title}
        </Link>
      </>
    );
    if (poster) {
      art = (
        <Link
          href={`/movies/${p.data.source_id}`}
          className="relative block h-14 w-10 shrink-0 overflow-hidden rounded bg-muted"
          tabIndex={-1}
          aria-hidden
        >
          <Image src={poster} alt="" fill sizes="40px" className="object-cover" />
        </Link>
      );
    }
  } else if (event.event_type === "follow") {
    const p = followPayload.safeParse(event.payload);
    if (!p.success) return null;
    body = (
      <>
        {head}
        <UserPlus className="mr-1 inline size-3.5" aria-hidden />
        started following{" "}
        <Link
          href={`/profile/${p.data.followee_username}`}
          className="font-medium hover:underline"
        >
          {p.data.followee_display_name || p.data.followee_username}
        </Link>
      </>
    );
  } else if (event.event_type === "review") {
    const p = reviewPayload.safeParse(event.payload);
    if (!p.success) return null;
    const href =
      p.data.tmdb_id === null
        ? null
        : p.data.media_type === "show"
          ? `/shows/${p.data.tmdb_id}`
          : `/movies/${p.data.tmdb_id}`;
    body = (
      <>
        {head}
        rated{" "}
        {href ? (
          <Link href={href} className="font-medium hover:underline">
            {p.data.title}
          </Link>
        ) : (
          <span className="font-medium">{p.data.title}</span>
        )}{" "}
        <span className="whitespace-nowrap">
          <Star
            className="inline size-3.5 fill-primary text-primary"
            aria-hidden
          />{" "}
          {p.data.rating}/10
        </span>
        {p.data.body ? (
          <span className="mt-1 block text-muted-foreground">
            “{p.data.body}”
          </span>
        ) : null}
      </>
    );
  } else if (event.event_type === "badge") {
    const p = badgePayload.safeParse(event.payload);
    if (!p.success) return null;
    body = (
      <>
        {head}
        <Award className="mr-1 inline size-3.5 text-primary" aria-hidden />
        unlocked the <strong>{p.data.badge_name}</strong> badge
      </>
    );
  } else {
    return null;
  }

  return (
    <li className="flex items-start gap-3 rounded-lg border p-3">
      {art}
      <div className="min-w-0 flex-1 text-sm">
        <p>{body}</p>
        <time
          dateTime={event.created_at}
          className="mt-0.5 block text-xs text-muted-foreground"
        >
          {relativeTime(event.created_at)}
        </time>
      </div>
    </li>
  );
}
