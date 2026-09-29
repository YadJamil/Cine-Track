import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Flame, Lock, Trophy } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getProfileByUsername } from "@/features/profile/queries";
import {
  StatsCharts,
  type SeriesPoint,
} from "@/features/stats/components/stats-charts";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/format";
import { currentStreak } from "@/lib/streak";
import { posterUrl } from "@/lib/tmdb/images";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} stats` };
}

export default async function StatsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await getUser();
  const { header, isOwner } = await getProfileByUsername(
    username,
    viewer?.id ?? null,
  );
  if (!header) notFound();

  if (!header.visible) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={Lock}
          title="This profile is private"
          description="Stats are only visible to the owner."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const [
    showMonth,
    showWeek,
    movieMonth,
    movieWeek,
    marathons,
    { data: stats },
    { data: progress },
    { data: connections },
    { data: addiction },
  ] = await Promise.all([
    supabase.rpc("fn_stats_by_month", { p_user_id: header.id, p_media: "show" }),
    supabase.rpc("fn_stats_by_week", { p_user_id: header.id, p_media: "show" }),
    supabase.rpc("fn_stats_by_month", { p_user_id: header.id, p_media: "movie" }),
    supabase.rpc("fn_stats_by_week", { p_user_id: header.id, p_media: "movie" }),
    supabase.rpc("fn_biggest_marathons", { p_user_id: header.id }),
    supabase
      .from("v_user_statistics")
      .select("*")
      .eq("user_id", header.id)
      .maybeSingle(),
    supabase
      .from("v_user_show_progress")
      .select("bucket")
      .eq("user_id", header.id)
      .eq("is_followed", true),
    isOwner
      ? supabase
          .from("user_daily_connections")
          .select("day")
          .eq("user_id", header.id)
          .order("day", { ascending: false })
          .limit(400)
      : Promise.resolve({ data: null }),
    isOwner
      ? supabase
          .from("show_addiction_scores")
          .select("show_id, monthly_score")
          .eq("user_id", header.id)
          .order("monthly_score", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: null }),
  ]);

  const toPoints = (
    rows: { month?: string; week?: string; count: number; hours: number }[] | null,
  ): SeriesPoint[] =>
    (rows ?? []).map((r) => ({
      label: r.month ?? r.week ?? "",
      count: r.count,
      hours: Number(r.hours),
    }));

  const streak = currentStreak((connections ?? []).map((d) => d.day));

  // "Completed" now means finished for good; shows still airing count as up to date.
  const completed = (progress ?? []).filter(
    (p) => p.bucket === "completed",
  ).length;
  const upToDate = (progress ?? []).filter(
    (p) => p.bucket === "up_to_date",
  ).length;

  let addictionShow: { name: string; tmdbId: number; posterPath: string | null; score: number } | null =
    null;
  const leader = addiction?.[0];
  if (leader && leader.monthly_score > 0) {
    const { data: s } = await supabase
      .from("shows")
      .select("name, tmdb_id, poster_path")
      .eq("id", leader.show_id)
      .maybeSingle();
    if (s) {
      addictionShow = {
        name: s.name,
        tmdbId: s.tmdb_id,
        posterPath: s.poster_path,
        score: leader.monthly_score,
      };
    }
  }

  const tvSeconds = stats?.seconds_watched ?? 0;
  const movieSeconds = stats?.movie_seconds_watched ?? 0;
  const headline: { label: string; value: string }[] = [
    { label: "Episodes watched", value: String(stats?.episodes_watched ?? 0) },
    { label: "Movies watched", value: String(stats?.movies_watched ?? 0) },
    { label: "TV time", value: formatDuration(tvSeconds) },
    { label: "Movie time", value: formatDuration(movieSeconds) },
    { label: "Total time", value: formatDuration(tvSeconds + movieSeconds) },
    { label: "Completed", value: String(completed) },
    { label: "Up to date", value: String(upToDate) },
  ];
  if (isOwner) {
    headline.push({ label: "Current streak", value: `${streak} days` });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link
        href={`/profile/${header.username}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {header.displayName || header.username}
      </Link>
      <h1 className="text-xl font-semibold">Stats</h1>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {headline.map((h) => (
          <div key={h.label} className="rounded-xl border p-3">
            <dt className="text-xs text-muted-foreground">{h.label}</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums">{h.value}</dd>
          </div>
        ))}
      </dl>

      <StatsCharts
        show={{ monthly: toPoints(showMonth.data), weekly: toPoints(showWeek.data) }}
        movie={{
          monthly: toPoints(movieMonth.data),
          weekly: toPoints(movieWeek.data),
        }}
      />

      <section aria-labelledby="marathons-heading">
        <h2
          id="marathons-heading"
          className="mb-3 flex items-center gap-2 text-lg font-semibold"
        >
          <Trophy className="size-5 text-primary" aria-hidden /> Biggest
          marathons
        </h2>
        {!marathons.data || marathons.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No marathons yet — watch a few episodes of one show in a day.
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {marathons.data.map((m, i) => {
              const poster = posterUrl(m.poster_path, "w154");
              return (
                <li
                  key={`${m.show_id}-${m.day}`}
                  className="flex items-center gap-3 rounded-lg border p-2"
                >
                  <span className="w-5 text-center text-sm font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="relative block h-12 w-8 shrink-0 overflow-hidden rounded-sm bg-muted">
                    {poster ? (
                      <Image
                        src={poster}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <Link
                      href={`/shows/${m.show_tmdb_id}`}
                      className="font-medium hover:underline"
                    >
                      {m.show_name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {m.episodes} episodes in a day ·{" "}
                      {new Date(`${m.day}T00:00:00`).toLocaleDateString()}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {addictionShow ? (
        <section
          aria-label="Most addictive show"
          className="flex items-center gap-3 rounded-xl border p-4"
        >
          <Flame className="size-8 text-primary" aria-hidden />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">
              Most addictive this month:{" "}
              <Link
                href={`/shows/${addictionShow.tmdbId}`}
                className="hover:underline"
              >
                {addictionShow.name}
              </Link>
            </p>
            <p className="text-xs text-muted-foreground">
              Addiction score {addictionShow.score}/100
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
