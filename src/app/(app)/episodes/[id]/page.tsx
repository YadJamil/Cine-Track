import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CommentSection } from "@/features/comments/components/comment-section";
import { getComments } from "@/features/comments/queries";
import { ReactionPicker } from "@/features/reactions/components/reaction-picker";
import { SpoilerSynopsis } from "@/features/shows/components/spoiler-synopsis";
import { EpisodeWatchButton } from "@/features/tracking/components/episode-watch-button";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ReactionType } from "@/lib/supabase/database.types";
import { formatAirDate, formatEpisodeCode } from "@/lib/format";
import { stillUrl } from "@/lib/tmdb/images";

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = parseId((await params).id);
  if (!id) return {};
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("episodes")
    .select("name, season_number, episode_number")
    .eq("id", id)
    .maybeSingle();
  if (!e) return {};
  return {
    title: `${formatEpisodeCode(e.season_number, e.episode_number)}${e.name ? ` · ${e.name}` : ""}`,
  };
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = parseId((await params).id);
  if (!id) notFound();

  const supabase = await createClient();
  const user = await getUser();

  const { data: episode } = await supabase
    .from("episodes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!episode) notFound();

  const [
    { data: show },
    { data: siblings },
    { data: watch },
    { data: reactions },
    comments,
  ] = await Promise.all([
    supabase
      .from("shows")
      .select("id, tmdb_id, name, episode_runtime")
      .eq("id", episode.show_id)
      .single(),
    supabase
      .from("episodes")
      .select("id, season_number, episode_number, air_date")
      .eq("show_id", episode.show_id)
      .gt("season_number", 0)
      .order("season_number")
      .order("episode_number"),
    user
      ? supabase
          .from("episode_watches")
          .select("watched_at")
          .eq("user_id", user.id)
          .eq("episode_id", id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("episode_reactions").select("user_id, reaction").eq("episode_id", id),
    getComments({ episodeId: id }, user?.id ?? null),
  ]);
  if (!show) notFound();

  const ordered = siblings ?? [];
  const index = ordered.findIndex((e) => e.id === id);
  const prev = index > 0 ? ordered[index - 1] : undefined;
  const next =
    index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : undefined;

  // aired, unwatched episodes strictly before this one (for the fill prompt)
  let earlierUnwatched = 0;
  if (user && index > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const earlierIds = ordered
      .slice(0, index)
      .filter((e) => e.air_date !== null && e.air_date <= today)
      .map((e) => e.id);
    if (earlierIds.length > 0) {
      const { count } = await supabase
        .from("episode_watches")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("episode_id", earlierIds);
      earlierUnwatched = earlierIds.length - (count ?? 0);
    }
  }

  const counts: Partial<Record<ReactionType, number>> = {};
  let ownReaction: ReactionType | null = null;
  for (const r of reactions ?? []) {
    counts[r.reaction] = (counts[r.reaction] ?? 0) + 1;
    if (user && r.user_id === user.id) ownReaction = r.reaction;
  }

  const still = stillUrl(episode.still_path, "w300");
  const watched = !!watch;
  const revalidate = `/episodes/${id}`;

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link
        href={`/shows/${show.tmdb_id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> {show.name}
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-72">
          {still ? (
            <Image
              src={still}
              alt={`${episode.name ?? "Episode"} still`}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 288px"
              className="object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">
            {formatEpisodeCode(episode.season_number, episode.episode_number)}
          </p>
          <h1 className="text-xl font-bold leading-tight">
            {episode.name ?? "Untitled episode"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatAirDate(episode.air_date)}
            {episode.runtime ?? show.episode_runtime
              ? ` · ${episode.runtime ?? show.episode_runtime}m`
              : ""}
          </p>
          <div className="mt-3">
            <EpisodeWatchButton
              showId={show.id}
              showTmdbId={show.tmdb_id}
              episodeId={episode.id}
              watched={watched}
              watchedAt={watch?.watched_at ?? null}
              earlierUnwatched={earlierUnwatched}
              unknownAirDate={episode.air_date === null}
              signedIn={!!user}
            />
          </div>
        </div>
      </header>

      {episode.overview ? (
        <SpoilerSynopsis text={episode.overview} blur={!!user && !watched} />
      ) : null}

      <section aria-label="Reactions">
        <h2 className="mb-2 text-sm font-medium">How was it?</h2>
        <ReactionPicker
          episodeId={episode.id}
          counts={counts}
          own={ownReaction}
          viewerId={user?.id ?? null}
          revalidate={revalidate}
        />
      </section>

      <nav aria-label="Episode navigation" className="flex justify-between">
        {prev ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/episodes/${prev.id}`} />}
          >
            <ChevronLeft data-icon="inline-start" aria-hidden />
            {formatEpisodeCode(prev.season_number, prev.episode_number)}
          </Button>
        ) : (
          <span />
        )}
        {next ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/episodes/${next.id}`} />}
          >
            {formatEpisodeCode(next.season_number, next.episode_number)}
            <ChevronRight data-icon="inline-end" aria-hidden />
          </Button>
        ) : null}
      </nav>

      <Separator />

      <CommentSection
        comments={comments}
        target={{ mediaType: "show", showId: show.id, episodeId: episode.id }}
        viewerId={user?.id ?? null}
        revalidate={revalidate}
      />
    </article>
  );
}
