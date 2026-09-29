import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { GenreBrowseGrid } from "@/features/explore/components/genre-browse-grid";
import { genreFromSlug } from "@/features/explore/genre-map";
import { getGenreBrowse, getUserGenreAffinity } from "@/features/explore/queries";
import { getUser } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const genre = genreFromSlug((await params).slug);
  return { title: genre ? `${genre} shows & movies` : "Explore" };
}

export default async function ExploreGenrePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const genre = genreFromSlug((await params).slug);
  if (!genre) notFound();

  const user = await getUser();
  const affinity = user ? await getUserGenreAffinity(user.id).catch(() => null) : null;

  const items = await getGenreBrowse(genre, {
    limit: 24,
    blockedShows: affinity?.blockedShows,
    blockedMovies: affinity?.blockedMovies,
    userId: user?.id,
  }).catch(() => []);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-xl font-semibold">{genre} shows &amp; movies</h1>
      {items.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Nothing here yet"
          description="Try a different genre."
        />
      ) : (
        <GenreBrowseGrid genre={genre} initial={items} />
      )}
    </div>
  );
}
