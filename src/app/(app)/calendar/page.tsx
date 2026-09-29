import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { AgendaCheck } from "@/features/calendar/agenda-check";
import { DayStrip, type StripDay } from "@/features/calendar/components/day-strip";
import { createClient, requireUser } from "@/lib/supabase/server";
import { formatEpisodeCode } from "@/lib/format";
import { posterUrl } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendar" };

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseMonth(raw: string | undefined): { year: number; month: number } {
  const m = raw?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (year >= 1950 && year <= 2100 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { month: monthParam } = await searchParams;
  const { year, month } = parseMonth(monthParam);

  const { data: settings } = await supabase
    .from("user_settings")
    .select("calendar_backward_days")
    .eq("user_id", user.id)
    .maybeSingle();
  const backwardDays = settings?.calendar_backward_days ?? 1;

  // Month grid: weeks starting Monday, padded to full weeks
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  const gridStart = new Date(first);
  gridStart.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  const gridEnd = new Date(last);
  gridEnd.setUTCDate(last.getUTCDate() + (6 - ((last.getUTCDay() + 6) % 7)));

  const today = iso(new Date());
  const agendaStart = new Date();
  agendaStart.setUTCDate(agendaStart.getUTCDate() - backwardDays);

  const [{ data: monthEpisodes, error }, { data: agendaEpisodes }] =
    await Promise.all([
      supabase.rpc("fn_upcoming_calendar", {
        p_user_id: user.id,
        p_from: iso(gridStart),
        p_to: iso(gridEnd),
      }),
      supabase.rpc("fn_upcoming_calendar", {
        p_user_id: user.id,
        p_from: iso(agendaStart),
        p_to: iso(new Date(Date.now() + 30 * 86_400_000)),
      }),
    ]);
  if (error) throw new Error(error.message);

  const byDay = new Map<string, NonNullable<typeof monthEpisodes>>();
  for (const e of monthEpisodes ?? []) {
    const bucket = byDay.get(e.air_date) ?? [];
    bucket.push(e);
    byDay.set(e.air_date, bucket);
  }

  const agendaByDay = new Map<string, NonNullable<typeof agendaEpisodes>>();
  for (const e of agendaEpisodes ?? []) {
    const bucket = agendaByDay.get(e.air_date) ?? [];
    bucket.push(e);
    agendaByDay.set(e.air_date, bucket);
  }
  const agendaDays = [...agendaByDay.keys()].sort();

  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(new Date(d));
  }
  const stripDays: StripDay[] = days
    .filter((d) => d.getUTCMonth() === month - 1)
    .map((d) => {
      const key = iso(d);
      return {
        iso: key,
        dayNum: d.getUTCDate(),
        weekdayLabel: d.toLocaleDateString(undefined, {
          weekday: "narrow",
          timeZone: "UTC",
        }),
        hasEpisodes: (byDay.get(key)?.length ?? 0) > 0,
        isToday: key === today,
      };
    });
  const initialSelectedIso =
    stripDays.find((d) => d.isToday)?.iso ?? stripDays[0]?.iso ?? today;

  const monthLabel = first.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const prevMonth = `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, "0")}`;
  const nextMonth = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <section aria-labelledby="calendar-heading">
        <div className="mb-4 flex items-center justify-between">
          <h1 id="calendar-heading" className="text-xl font-semibold">
            {monthLabel}
          </h1>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous month"
              render={<Link href={`/calendar?month=${prevMonth}`} />}
            >
              <ChevronLeft aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/calendar" />}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next month"
              render={<Link href={`/calendar?month=${nextMonth}`} />}
            >
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </div>

        <div className="hidden overflow-hidden rounded-xl border sm:block">
          <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = iso(day);
              const eps = byDay.get(key) ?? [];
              const inMonth = day.getUTCMonth() === month - 1;
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-24 border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0",
                    !inMonth && "bg-muted/20 opacity-50",
                  )}
                >
                  <p
                    className={cn(
                      "mb-1 text-right text-xs tabular-nums",
                      key === today
                        ? "font-bold text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    {day.getUTCDate()}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {eps.slice(0, 3).map((e) => {
                      const poster = posterUrl(e.poster_path, "w154");
                      return (
                        <Link
                          key={e.episode_id}
                          href={`/episodes/${e.episode_id}`}
                          title={`${e.show_name} ${formatEpisodeCode(e.season_number, e.episode_number)}`}
                          className="relative block h-10 w-7 overflow-hidden rounded-sm bg-muted"
                        >
                          {poster ? (
                            <Image
                              src={poster}
                              alt={`${e.show_name} poster`}
                              fill
                              sizes="28px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="p-0.5 text-[8px]">{e.show_name}</span>
                          )}
                        </Link>
                      );
                    })}
                    {eps.length > 3 ? (
                      <span className="self-end text-[10px] text-muted-foreground">
                        +{eps.length - 3}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sm:hidden">
          <DayStrip days={stripDays} initialSelectedIso={initialSelectedIso} />
        </div>
      </section>

      <section aria-labelledby="agenda-heading">
        <h2 id="agenda-heading" className="mb-4 text-lg font-semibold">
          Coming up
        </h2>
        {agendaDays.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nothing scheduled"
            description="Episodes of shows you follow will appear here as they air."
            actionLabel="Explore shows"
            actionHref="/explore"
          />
        ) : (
          <div className="flex flex-col gap-5">
            {agendaDays.map((day) => {
              const eps = agendaByDay.get(day) ?? [];
              const label = new Date(`${day}T00:00:00Z`).toLocaleDateString(
                undefined,
                { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" },
              );
              return (
                <div key={day} id={`day-${day}`}>
                  <h3
                    className={cn(
                      "mb-2 text-sm font-medium",
                      day === today && "text-primary",
                    )}
                  >
                    {day === today ? "Today" : label}
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {eps.map((e) => {
                      const poster = posterUrl(e.poster_path, "w154");
                      const code = formatEpisodeCode(
                        e.season_number,
                        e.episode_number,
                      );
                      const aired = e.air_date <= today;
                      return (
                        <li
                          key={e.episode_id}
                          className="flex items-center gap-3 rounded-lg border p-2"
                        >
                          <Link
                            href={`/shows/${e.show_tmdb_id}`}
                            className="relative block h-12 w-8 shrink-0 overflow-hidden rounded-sm bg-muted"
                            tabIndex={-1}
                            aria-hidden
                          >
                            {poster ? (
                              <Image
                                src={poster}
                                alt=""
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            ) : null}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/episodes/${e.episode_id}`}
                              className="line-clamp-1 text-sm font-medium hover:underline"
                            >
                              {e.show_name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {code}
                              {e.episode_name ? ` · ${e.episode_name}` : ""}
                            </p>
                          </div>
                          {aired ? (
                            <AgendaCheck
                              showId={e.show_id}
                              showTmdbId={e.show_tmdb_id}
                              episodeId={e.episode_id}
                              watched={e.is_watched}
                              label={`${e.show_name} ${code}`}
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
