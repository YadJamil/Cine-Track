import type { Metadata } from "next";
import { Tv } from "lucide-react";
import { getPopularShows } from "@/features/explore/queries";
import { MediaPoster } from "@/components/shared/media-poster";
import { EmptyState } from "@/components/shared/empty-state";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Popular shows" };

export default async function ExploreShowsPage() {
  const user = await getUser();
  const shows = await getPopularShows(60, user?.id).catch(() => []);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Popular shows</h1>
      {shows.length === 0 ? (
        <EmptyState
          icon={Tv}
          title="No shows to show"
          description="Try again in a moment."
        />
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {shows.map((s) => (
            <MediaPoster
              key={s.key}
              href={s.href}
              title={s.title}
              posterUrl={s.posterUrl}
              subtitle={s.subtitle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
