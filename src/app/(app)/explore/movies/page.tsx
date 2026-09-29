import type { Metadata } from "next";
import { Film } from "lucide-react";
import { getPopularMovies } from "@/features/explore/queries";
import { MediaPoster } from "@/components/shared/media-poster";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Popular movies" };

export default async function ExploreMoviesPage() {
  const movies = await getPopularMovies(60).catch(() => []);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Popular movies</h1>
      {movies.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No movies to show"
          description="Try again in a moment."
        />
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {movies.map((m) => (
            <MediaPoster
              key={m.key}
              href={m.href}
              title={m.title}
              posterUrl={m.posterUrl}
              subtitle={m.subtitle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
