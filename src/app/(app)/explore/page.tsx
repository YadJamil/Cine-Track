import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { MediaRow } from "@/components/shared/media-row";
import { GenreChipBar } from "@/features/explore/components/genre-chip-bar";
import { SpotlightHero } from "@/features/explore/components/spotlight-hero";
import { genreSlug } from "@/features/explore/genre-map";
import {
  getDefaultGenres,
  getGenreBrowse,
  getLocalTrending,
  getPopularMovies,
  getPopularShows,
  getRecommendedForYou,
  getUserGenreAffinity,
} from "@/features/explore/queries";
import { topGenres } from "@/features/explore/scoring";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage() {
  const user = await getUser();

  const [trending, popularShows, popularMovies, affinity] = await Promise.all([
    getLocalTrending().catch(() => []),
    getPopularShows(12, user?.id).catch(() => []),
    getPopularMovies().catch(() => []),
    user ? getUserGenreAffinity(user.id).catch(() => null) : Promise.resolve(null),
  ]);

  // Page rows use the tighter k=3/threshold=0.2 cut baked into topGenres;
  // the chip bar can afford to be more inclusive since it's just navigation.
  const rowGenres = affinity?.topGenres.length ? affinity.topGenres : getDefaultGenres();
  const chipGenres = affinity ? topGenres(affinity.affinity, 5, 0.15) : getDefaultGenres();
  const topRowGenres = rowGenres.slice(0, 3);

  const [recommended, ...genreRows] = await Promise.all([
    affinity ? getRecommendedForYou(affinity).catch(() => []) : Promise.resolve([]),
    ...topRowGenres.map((genre) =>
      getGenreBrowse(genre, {
        limit: 12,
        blockedShows: affinity?.blockedShows,
        blockedMovies: affinity?.blockedMovies,
        userId: user?.id,
      }).catch(() => []),
    ),
  ]);

  const [hero, ...restTrending] = trending;
  const anyContent =
    trending.length > 0 || popularShows.length > 0 || popularMovies.length > 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <h1 className="text-xl font-semibold">Explore</h1>

      {!anyContent ? (
        <EmptyState
          icon={Compass}
          title="Nothing to explore yet"
          description="Follow some shows or run the seed script, then reload."
        />
      ) : (
        <>
          {hero ? <SpotlightHero item={hero} /> : null}
          <MediaRow heading="Trending on CineTrack" items={restTrending} />
          {recommended.length > 0 ? (
            <MediaRow heading="Recommended for you" items={recommended} />
          ) : null}
          <GenreChipBar genres={chipGenres} />
          {topRowGenres.map((genre, i) => (
            <MediaRow
              key={genre}
              heading={`Top ${genre}`}
              items={genreRows[i] ?? []}
              moreHref={`/explore/genre/${genreSlug(genre)}`}
            />
          ))}
          {popularShows.length > 0 ? (
            <MediaRow
              heading="Popular shows"
              items={popularShows}
              moreHref="/explore/shows"
            />
          ) : null}
          {popularMovies.length > 0 ? (
            <MediaRow
              heading="Popular movies"
              items={popularMovies}
              moreHref="/explore/movies"
            />
          ) : null}
        </>
      )}
    </div>
  );
}
