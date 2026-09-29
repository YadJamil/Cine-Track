import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  MarkSeasonButton,
  SeasonEpisodes,
} from "@/features/shows/components/season-episodes";
import { getShowPageData } from "@/features/shows/queries";
import { getUser } from "@/lib/supabase/server";
import { TmdbError } from "@/lib/tmdb/client";
import { formatAirDate } from "@/lib/format";

function parsePositiveInt(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  return { title: `Season ${n}` };
}

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ id: string; n: string }>;
}) {
  const { id, n } = await params;
  const tmdbId = parsePositiveInt(id);
  const seasonNumber = parsePositiveInt(n);
  if (!tmdbId || seasonNumber === null) notFound();

  const user = await getUser();
  let data;
  try {
    data = await getShowPageData(tmdbId, user?.id ?? null);
  } catch (e) {
    if (e instanceof TmdbError && e.status === 404) notFound();
    throw e;
  }
  const season = data.seasons.find((s) => s.seasonNumber === seasonNumber);
  if (!season) notFound();
  const episodes = data.episodesBySeason.get(seasonNumber) ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link
        href={`/shows/${tmdbId}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> {data.show.name}
      </Link>
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {season.name || `Season ${seasonNumber}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatAirDate(season.airDate)} · {season.watchedCount}/
            {season.airedCount || season.episodeCount} watched
          </p>
        </div>
        <MarkSeasonButton
          showId={data.show.id}
          showTmdbId={tmdbId}
          seasonNumber={seasonNumber}
          remaining={Math.max(0, season.airedCount - season.watchedCount)}
          signedIn={!!user}
        />
      </header>
      <SeasonEpisodes
        episodes={episodes}
        showId={data.show.id}
        showTmdbId={tmdbId}
        signedIn={!!user}
      />
    </div>
  );
}
