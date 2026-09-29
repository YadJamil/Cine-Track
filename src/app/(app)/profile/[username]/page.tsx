import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BarChart3, Lock, Settings, Tv, Film, Activity, PlayCircle, Users, MessageSquare, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EditProfileDialog } from "@/features/profile/components/edit-profile-dialog";
import { LogWatchedDialog } from "@/features/profile/components/log-watched-dialog";
import {
  ProfileLibrary,
  type LibraryItem,
} from "@/features/profile/components/profile-library";
import {
  getProfileBadges,
  getProfileByUsername,
  getProfileMovies,
  getProfileShows,
  getProfileStatistics,
  getRecentWatches,
} from "@/features/profile/queries";
import { FollowButton } from "@/features/social/components/follow-button";
import { getUser } from "@/lib/supabase/server";
import { formatDuration, formatEpisodeCode, relativeTime } from "@/lib/format";
import { posterUrl } from "@/lib/tmdb/images";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

/** Extract genre names from the stored jsonb (`[{ name }]`), excluding Adult. */
function genreNames(json: unknown): string[] {
  return Array.isArray(json)
    ? json.flatMap((g) =>
        g && typeof g === "object" && typeof (g as { name?: unknown }).name === "string"
          ? [(g as { name: string }).name]
          : [],
      ).filter((name) => name.toLowerCase() !== "adult")
    : [];
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await getUser();
  const { header, isOwner, viewerFollows, affinity } =
    await getProfileByUsername(username, viewer?.id ?? null);
  if (!header) notFound();

  const locked = !header.visible;
  const [stats, shows, movies, badges, activity] = locked
    ? [null, [], [], [], []]
    : await Promise.all([
        getProfileStatistics(header.id),
        getProfileShows(header.id),
        getProfileMovies(header.id),
        getProfileBadges(header.id),
        getRecentWatches(header.id),
      ]);

  const name = header.displayName || header.username;

  const showItems: LibraryItem[] = shows.map((s) => ({
    key: `show-${s.show_id}`,
    href: `/shows/${s.tmdb_id}`,
    title: s.name,
    posterUrl: posterUrl(s.poster_path),
    subtitle: `${s.watched_count}/${s.aired_count}`,
    progress: s.aired_count > 0 ? (s.watched_count / s.aired_count) * 100 : 0,
    status: s.bucket,
    favorite: s.is_favorited,
    genres: genreNames(s.genres),
  }));
  const movieItems: LibraryItem[] = movies.map((m) => ({
    key: `movie-${m.movieId}`,
    href: `/movies/${m.sourceId}`,
    title: m.title,
    posterUrl: posterUrl(m.posterPath),
    genres: genreNames(m.genres),
  }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {/* Header */}
      <header className="relative -mx-4 -mt-4 md:-mx-6 md:-mt-6">
        <div className="relative h-40 w-full overflow-hidden bg-muted md:h-52">
          {header.coverUrl ? (
            <Image
              src={header.coverUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/25 to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
        <div className="relative z-10 -mt-10 flex flex-wrap items-end gap-3 px-4 md:px-6">
          <UserAvatar
            username={header.username}
            displayName={header.displayName}
            avatarUrl={header.avatarUrl}
            className="size-20 border-4 border-background text-xl md:size-24"
          />
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
              {name}
              {affinity !== null ? (
                <Badge variant="secondary">{Math.round(affinity)}% match</Badge>
              ) : null}
              {!header.isPublic ? (
                <Lock
                  className="size-4 text-muted-foreground"
                  aria-label="Private profile"
                />
              ) : null}
            </h1>
            <p className="text-sm text-muted-foreground">@{header.username}</p>
          </div>
          <div className="flex items-center gap-2 pb-1">
            {isOwner ? (
              <>
                {/* Mobile has no Settings in the bottom nav — surface it here. */}
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  render={<Link href="/settings" aria-label="Settings" />}
                >
                  <Settings aria-hidden />
                </Button>
                <LogWatchedDialog username={header.username} />
                <EditProfileDialog profile={header} />
              </>
            ) : (
              <FollowButton
                followeeId={header.id}
                username={header.username}
                initialFollowing={viewerFollows}
                signedIn={!!viewer}
              />
            )}
          </div>
        </div>
      </header>

      {header.bio ? (
        <p className="max-w-2xl text-sm text-muted-foreground">{header.bio}</p>
      ) : null}

      {locked ? (
        <EmptyState
          icon={Lock}
          title="This profile is private"
          description="Only they can see their shows, stats and activity."
        />
      ) : (
        <>
          {/* Counters (v_user_statistics parity) */}
          {stats ? (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {[
                { label: "Shows", value: String(stats.shows_followed), icon: Tv },
                { label: "Episodes", value: String(stats.episodes_watched), icon: PlayCircle },
                { label: "Movies", value: String(stats.movies_watched), icon: Film },
                {
                  label: "TV time",
                  value: formatDuration(stats.seconds_watched),
                  icon: Clock,
                },
                {
                  label: "Movie time",
                  value: formatDuration(stats.movie_seconds_watched),
                  icon: Clock,
                },
                { label: "Followers", value: String(stats.followers_count), icon: Users },
                { label: "Following", value: String(stats.following_count), icon: Users },
                { label: "Reviews", value: String(stats.reviews_count), icon: MessageSquare },
              ].map((item) => {
                const Icon = item.icon;
                const inner = (
                  <>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 group-hover:text-muted-foreground transition-colors duration-300">
                      {item.label}
                    </dt>
                    <dd className="text-base sm:text-lg font-black tracking-tight tabular-nums text-foreground mt-1.5 group-hover:text-primary transition-colors duration-300">
                      {item.value}
                    </dd>
                    <Icon className="absolute top-2.5 right-2.5 size-4 text-muted-foreground/30 group-hover:text-primary/70 group-hover:scale-110 transition-all duration-300" aria-hidden />
                  </>
                );
                const linkTarget =
                  item.label === "Followers"
                    ? `/profile/${header.username}/followers`
                    : item.label === "Following"
                      ? `/profile/${header.username}/following`
                      : null;
                return (
                  <div
                    key={item.label}
                    className="group relative rounded-xl border border-border/50 bg-secondary/15 p-3 flex flex-col justify-end min-h-[4.75rem] overflow-hidden hover:bg-secondary/35 hover:border-primary/20 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(251,215,55,0.02)] transition-all duration-300 select-none active:scale-[0.98]"
                  >
                    {linkTarget ? (
                      <Link href={linkTarget} className="block w-full h-full hover:opacity-100 cursor-pointer">
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </div>
                );
              })}
            </dl>
          ) : null}

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/profile/${header.username}/stats`} />}
            >
              <BarChart3 data-icon="inline-start" aria-hidden /> Full stats
            </Button>
          </div>

          <Tabs defaultValue="shows">
            <TabsList className="w-full justify-start overflow-x-auto gap-1 bg-transparent p-0 border-b border-border/40 pb-2 h-auto! rounded-none! no-scrollbar">
              <TabsTrigger
                value="shows"
                className="group relative gap-2 px-3 py-1.5 transition-all duration-300 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap text-muted-foreground/80 hover:bg-accent/40 hover:text-foreground data-active:bg-primary/10 data-active:text-primary data-active:border-primary/20 data-active:shadow-[0_0_12px_rgba(251,215,55,0.08)]"
              >
                <Tv className="size-4 shrink-0 transition-transform duration-300 group-data-active:scale-110" />
                Shows
              </TabsTrigger>
              <TabsTrigger
                value="movies"
                className="group relative gap-2 px-3 py-1.5 transition-all duration-300 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap text-muted-foreground/80 hover:bg-accent/40 hover:text-foreground data-active:bg-primary/10 data-active:text-primary data-active:border-primary/20 data-active:shadow-[0_0_12px_rgba(251,215,55,0.08)]"
              >
                <Film className="size-4 shrink-0 transition-transform duration-300 group-data-active:scale-110" />
                Movies
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="group relative gap-2 px-3 py-1.5 transition-all duration-300 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap text-muted-foreground/80 hover:bg-accent/40 hover:text-foreground data-active:bg-primary/10 data-active:text-primary data-active:border-primary/20 data-active:shadow-[0_0_12px_rgba(251,215,55,0.08)]"
              >
                <Activity className="size-4 shrink-0 transition-transform duration-300 group-data-active:scale-110" />
                Activity
              </TabsTrigger>
              <TabsTrigger
                value="badges"
                className="group relative gap-2 px-3 py-1.5 transition-all duration-300 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap text-muted-foreground/80 hover:bg-accent/40 hover:text-foreground data-active:bg-primary/10 data-active:text-primary data-active:border-primary/20 data-active:shadow-[0_0_12px_rgba(251,215,55,0.08)]"
              >
                <Award className="size-4 shrink-0 transition-transform duration-300 group-data-active:scale-110" />
                Badges
                {badges.length > 0 ? (
                  <span className="ml-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums transition-all duration-300 bg-muted text-muted-foreground group-data-active:bg-primary/20 group-data-active:text-primary">
                    {badges.length}
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shows" className="mt-4 transition-all duration-300 data-open:animate-in data-open:fade-in-30 data-open:slide-in-from-bottom-2">
              <ProfileLibrary
                items={showItems}
                emptyTitle="No shows yet"
                emptyDescription={
                  isOwner
                    ? "Follow shows to build your library."
                    : `${name} isn't tracking any shows yet.`
                }
              />
            </TabsContent>

            <TabsContent value="movies" className="mt-4 transition-all duration-300 data-open:animate-in data-open:fade-in-30 data-open:slide-in-from-bottom-2">
              <ProfileLibrary
                items={movieItems}
                emptyTitle="No movies yet"
                emptyDescription={
                  isOwner
                    ? "Mark movies as watched to see them here."
                    : `${name} hasn't watched any movies yet.`
                }
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-4 transition-all duration-300 data-open:animate-in data-open:fade-in-30 data-open:slide-in-from-bottom-2">
              {activity.length === 0 ? (
                <EmptyState
                  icon={Tv}
                  title="No activity yet"
                  description="Watched episodes show up here."
                />
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {activity.map((a) => (
                    <li
                      key={a.episodeId}
                      className="flex items-center gap-3 rounded-lg border p-2 text-sm"
                    >
                      <span className="relative block h-12 w-8 shrink-0 overflow-hidden rounded-sm bg-muted">
                        {posterUrl(a.posterPath, "w154") ? (
                          <Image
                            src={posterUrl(a.posterPath, "w154") as string}
                            alt=""
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <Link
                          href={`/episodes/${a.episodeId}`}
                          className="hover:underline"
                        >
                          <strong>{a.showName}</strong>{" "}
                          {formatEpisodeCode(a.seasonNumber, a.episodeNumber)}
                          {a.episodeName ? ` · ${a.episodeName}` : ""}
                        </Link>
                      </span>
                      <time
                        dateTime={a.watchedAt}
                        className="shrink-0 text-xs text-muted-foreground"
                      >
                        {relativeTime(a.watchedAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="badges" className="mt-4 transition-all duration-300 data-open:animate-in data-open:fade-in-30 data-open:slide-in-from-bottom-2">
              {badges.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No badges yet"
                  description="Watch, connect and review to unlock achievements."
                />
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {badges.map(({ badge, unlockedAt }) => (
                    <li
                      key={badge.id}
                      className="flex flex-col items-center gap-1 rounded-xl border p-4 text-center"
                    >
                      <Award className="size-8 text-primary" aria-hidden />
                      <p className="text-sm font-semibold">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {badge.description}
                      </p>
                      <time
                        dateTime={unlockedAt}
                        className="text-xs text-muted-foreground"
                      >
                        {relativeTime(unlockedAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
