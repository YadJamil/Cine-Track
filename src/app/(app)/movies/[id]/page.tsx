import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import {
  DetailTabs,
  DetailTabsContent,
  DetailTabsList,
  DetailTabsTrigger,
} from "@/components/shared/detail-tabs";
import { MediaPoster } from "@/components/shared/media-poster";
import { CommentSection } from "@/features/comments/components/comment-section";
import { getComments } from "@/features/comments/queries";
import { MovieCoverButton } from "@/features/movies/components/movie-cover-button";
import { MovieWatchButton } from "@/features/movies/components/movie-watch-button";
import { ReviewSection } from "@/features/reviews/components/review-section";
import { getReviews } from "@/features/reviews/queries";
import { createClient, getUser } from "@/lib/supabase/server";
import { getOrCacheMovie } from "@/lib/tmdb/cache";
import { cinemeta, TmdbError } from "@/lib/tmdb/client";
import { backdropUrl, posterUrl } from "@/lib/tmdb/images";
import { formatDuration } from "@/lib/format";

const genresSchema = z.array(z.object({ name: z.string() }));

function parseImdbId(raw: string): string | null {
  return /^tt\d+$/.test(raw) ? raw : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const imdbId = parseImdbId((await params).id);
  if (!imdbId) return {};
  try {
    const details = await cinemeta.movieDetails(imdbId);
    return { title: details.name };
  } catch {
    return {};
  }
}

export default async function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const imdbId = parseImdbId((await params).id);
  if (!imdbId) notFound();

  const user = await getUser();
  let movie;
  try {
    movie = await getOrCacheMovie(imdbId);
  } catch (e) {
    if (e instanceof TmdbError && e.status === 404) notFound();
    throw e;
  }

  const supabase = await createClient();
  const genres = genresSchema.safeParse(movie.genres);
  const primaryGenre = genres.success ? genres.data[0]?.name : undefined;

  const [{ data: watch }, comments, reviewData, similar] =
    await Promise.all([
      user
        ? supabase
            .from("movie_watches")
            .select("watched_at")
            .eq("user_id", user.id)
            .eq("movie_id", movie.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      getComments({ movieId: movie.id }, user?.id ?? null),
      getReviews({ movieId: movie.id }),
      // No recommendations API — surface same-genre movies from Cinemeta instead.
      primaryGenre
        ? cinemeta
            .moviesByGenre(primaryGenre)
            .then((list) =>
              list.filter((m) => (m.imdb_id ?? m.id) !== movie.source_id),
            )
            .catch(() => null)
        : Promise.resolve(null),
    ]);


  const backdrop = backdropUrl(movie.backdrop_path);
  const poster = posterUrl(movie.poster_path);
  const year = movie.release_date?.slice(0, 4);
  const revalidate = `/movies/${imdbId}`;

  return (
    <article className="mx-auto flex max-w-5xl flex-col gap-6">
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
                alt={`${movie.title} poster`}
                fill
                sizes="144px"
                className="object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0 pb-1">
            {user ? (
              <span
                className={
                  "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] " +
                  (watch
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-muted/50 text-muted-foreground")
                }
              >
                {watch ? <Check className="size-3" aria-hidden /> : null}
                {watch ? "Watched" : "Not watched"}
              </span>
            ) : null}
            <h1 className="mt-1.5 text-2xl font-bold leading-tight md:text-3xl">
              {movie.title}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {year ? <span>{year}</span> : null}
              {movie.runtime ? <span>{formatDuration(movie.runtime * 60)}</span> : null}
              {movie.vote_average ? (
                <span>★ {movie.vote_average.toFixed(1)}</span>
              ) : null}
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <MovieWatchButton
            movieId={movie.id}
            movieTmdbId={movie.source_id}
            watched={!!watch}
            watchedAt={watch?.watched_at ?? null}
            signedIn={!!user}
          />
          {movie.backdrop_path ? (
            <MovieCoverButton
              movieId={movie.id}
              movieSourceId={movie.source_id}
              signedIn={!!user}
            />
          ) : null}
        </div>
        {genres.success && genres.data.length > 0 ? (
          <p className="flex flex-wrap gap-1.5">
            {genres.data.map((g) => (
              <Badge key={g.name} variant="secondary">
                {g.name}
              </Badge>
            ))}
          </p>
        ) : null}
        {movie.overview ? (
          <p className="max-w-3xl text-sm text-muted-foreground">
            {movie.overview}
          </p>
        ) : null}
      </div>

      <DetailTabs defaultValue="comments">
        <DetailTabsList>
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

        <DetailTabsContent value="comments">
          <CommentSection
            comments={comments}
            target={{ mediaType: "movie", movieId: movie.id }}
            viewerId={user?.id ?? null}
            revalidate={revalidate}
          />
        </DetailTabsContent>

        <DetailTabsContent value="reviews">
          <ReviewSection
            reviews={reviewData.reviews}
            average={reviewData.average}
            mediaType="movie"
            movieId={movie.id}
            viewerId={user?.id ?? null}
            revalidate={revalidate}
          />
        </DetailTabsContent>

        <DetailTabsContent value="similar">
          {similar && similar.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {similar.slice(0, 12).map((m) => (
                <MediaPoster
                  key={m.id}
                  href={`/movies/${m.imdb_id ?? m.id}`}
                  title={m.name}
                  posterUrl={posterUrl(m.poster ?? null)}
                  subtitle={m.releaseInfo?.slice(0, 4) ?? null}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No recommendations available.
            </p>
          )}
        </DetailTabsContent>
      </DetailTabs>
    </article>
  );
}
