import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SeasonAccordion } from "@/features/shows/components/season-accordion";
import {
  DetailTabs,
  DetailTabsContent,
  DetailTabsList,
  DetailTabsTrigger,
} from "@/components/shared/detail-tabs";
import { MediaPoster } from "@/components/shared/media-poster";
import { BUCKET_META, StatusDot } from "@/components/shared/show-status";
import { CommentSection } from "@/features/comments/components/comment-section";
import { getComments } from "@/features/comments/queries";
import { ReviewSection } from "@/features/reviews/components/review-section";
import { getReviews } from "@/features/reviews/queries";
import { ShowActions } from "@/features/shows/components/show-actions";
import {
  MarkSeasonButton,
  SeasonEpisodes,
} from "@/features/shows/components/season-episodes";
import { getShowPageData, getSimilarShows } from "@/features/shows/queries";
import { getUser } from "@/lib/supabase/server";
import { tvmaze, TmdbError } from "@/lib/tmdb/client";
import { backdropUrl, posterUrl } from "@/lib/tmdb/images";
import { formatAirDate } from "@/lib/format";

const genresSchema = z.array(z.object({ name: z.string() }));

function parseTmdbId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const tmdbId = parseTmdbId((await params).id);
  if (!tmdbId) return {};
  try {
    const details = await tvmaze.showDetails(tmdbId);
    return { title: details.name };
  } catch {
    return {};
  }
}

export default async function ShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tmdbId = parseTmdbId((await params).id);
  if (!tmdbId) notFound();

  const user = await getUser();
  let data;
  try {
    data = await getShowPageData(tmdbId, user?.id ?? null);
  } catch (e) {
    if (e instanceof TmdbError && e.status === 404) notFound();
    throw e;
  }
  const {
    show,
    seasons,
    episodesBySeason,
    userShow,
    bucket,
    watchedCount,
    airedCount,
  } = data;

  const genres = genresSchema.safeParse(show.genres);
  const genreList = genres.success ? genres.data : [];

  const [comments, reviewData, similar] = await Promise.all([
    getComments({ showId: show.id }, user?.id ?? null),
    getReviews({ showId: show.id }),
    getSimilarShows(show.id, genreList).catch(() => []),
  ]);
  const backdrop = backdropUrl(show.backdrop_path);
  const poster = posterUrl(show.poster_path);
  const year = show.first_air_date?.slice(0, 4);
  const revalidate = `/shows/${tmdbId}`;
  const defaultSeason =
    seasons.find(
      (s) => s.seasonNumber > 0 && s.watchedCount < s.airedCount,
    )?.seasonNumber ??
    seasons.find((s) => s.seasonNumber > 0)?.seasonNumber ??
    seasons[0]?.seasonNumber;

  return (
    <article className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Hero */}
      <header className="relative -mx-4 -mt-4 md:-mx-6 md:-mt-6">
        <div className="relative aspect-[16/7] min-h-56 w-full overflow-hidden bg-muted">
          {backdrop ? (
            <Image
              src={backdrop}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        <div className="relative z-10 -mt-20 flex items-end gap-4 px-4 md:px-6">
          <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-lg border bg-muted shadow-lg ring-1 ring-white/10 md:w-36">
            {poster ? (
              <Image
                src={poster}
                alt={`${show.name} poster`}
                fill
                sizes="144px"
                className="object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0 pb-1">
            {bucket ? (
              <span
                className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${BUCKET_META[bucket].badge}`}
              >
                <StatusDot bucket={bucket} />
                {BUCKET_META[bucket].label}
              </span>
            ) : null}
            <h1 className="mt-1.5 text-2xl font-bold leading-tight md:text-3xl">
              {show.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {year ? <span>{year}</span> : null}
              {show.status ? (
                <Badge variant="outline">{show.status}</Badge>
              ) : null}
              {show.vote_average ? (
                <span>★ {show.vote_average.toFixed(1)}</span>
              ) : null}
              {show.number_of_seasons ? (
                <span>
                  {show.number_of_seasons} season
                  {show.number_of_seasons === 1 ? "" : "s"}
                </span>
              ) : null}
            </p>
            {user && airedCount > 0 ? (
              <div className="mt-2 flex max-w-64 items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${(watchedCount / airedCount) * 100}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {watchedCount}/{airedCount}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <ShowActions
          showId={show.id}
          showTmdbId={show.tmdb_id}
          flags={userShow}
          bucket={bucket}
          signedIn={!!user}
          watchedCount={watchedCount}
          airedCount={airedCount}
        />
        {genres.success && genres.data.length > 0 ? (
          <p className="flex flex-wrap gap-1.5">
            {genres.data.map((g) => (
              <Badge key={g.name} variant="secondary">
                {g.name}
              </Badge>
            ))}
          </p>
        ) : null}
        {show.overview ? (
          <p className="max-w-3xl text-sm text-muted-foreground">
            {show.overview}
          </p>
        ) : null}
      </div>

      <DetailTabs defaultValue="episodes">
        <DetailTabsList>
          <DetailTabsTrigger value="episodes">Episodes</DetailTabsTrigger>
          <DetailTabsTrigger
            value="comments"
            count={comments.length > 0 ? comments.length : undefined}
          >
            Comments
          </DetailTabsTrigger>
          <DetailTabsTrigger
            value="reviews"
            count={
              reviewData.reviews.length > 0
                ? reviewData.reviews.length
                : undefined
            }
          >
            Reviews
          </DetailTabsTrigger>
          <DetailTabsTrigger value="similar">Similar</DetailTabsTrigger>
        </DetailTabsList>

        <DetailTabsContent value="episodes">
          {seasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No episode data available yet.
            </p>
          ) : (
            <SeasonAccordion
              key={show.id}
              initialValue={
                defaultSeason !== undefined ? [`season-${defaultSeason}`] : []
              }
            >
              {seasons.map((s) => {
                const eps = episodesBySeason.get(s.seasonNumber) ?? [];
                return (
                  <AccordionItem key={s.id} value={`season-${s.seasonNumber}`}>
                    <AccordionTrigger className="text-sm">
                      <span className="flex flex-1 flex-col gap-1.5 pr-2">
                        <span className="flex items-center justify-between gap-2">
                          <span>
                            {s.name || `Season ${s.seasonNumber}`}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {formatAirDate(s.airDate)}
                            </span>
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {s.watchedCount}/{s.airedCount || s.episodeCount}
                          </span>
                        </span>
                        {s.airedCount > 0 ? (
                          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-[width]"
                              style={{
                                width: `${(s.watchedCount / s.airedCount) * 100}%`,
                              }}
                            />
                          </div>
                        ) : null}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-3">
                      <MarkSeasonButton
                        showId={show.id}
                        showTmdbId={show.tmdb_id}
                        seasonNumber={s.seasonNumber}
                        remaining={Math.max(0, s.airedCount - s.watchedCount)}
                        signedIn={!!user}
                      />
                      <SeasonEpisodes
                        episodes={eps}
                        showId={show.id}
                        showTmdbId={show.tmdb_id}
                        signedIn={!!user}
                      />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </SeasonAccordion>
          )}
        </DetailTabsContent>

        <DetailTabsContent value="comments">
          <CommentSection
            comments={comments}
            target={{ mediaType: "show", showId: show.id }}
            viewerId={user?.id ?? null}
            revalidate={revalidate}
          />
        </DetailTabsContent>

        <DetailTabsContent value="reviews">
          <ReviewSection
            reviews={reviewData.reviews}
            average={reviewData.average}
            mediaType="show"
            showId={show.id}
            viewerId={user?.id ?? null}
            revalidate={revalidate}
          />
        </DetailTabsContent>

        <DetailTabsContent value="similar">
          {similar.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {similar.map((s) => (
                <MediaPoster
                  key={s.tmdbId}
                  href={`/shows/${s.tmdbId}`}
                  title={s.name}
                  posterUrl={posterUrl(s.posterPath)}
                  subtitle={s.year}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No similar shows yet.
            </p>
          )}
        </DetailTabsContent>
      </DetailTabs>
    </article>
  );
}
