import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { MediaPoster } from "@/components/shared/media-poster";
import { UserAvatar } from "@/components/shared/user-avatar";
import { FollowButton } from "@/features/social/components/follow-button";
import { SearchInput } from "@/features/search/components/search-input";
import { createClient, getUser } from "@/lib/supabase/server";
import { cinemeta, tvmaze } from "@/lib/tmdb/client";
import { posterUrl } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Search" };

const TABS = [
  { key: "shows", label: "Shows" },
  { key: "movies", label: "Movies" },
  { key: "people", label: "People" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const tab: TabKey = TABS.some((t) => t.key === params.tab)
    ? (params.tab as TabKey)
    : "shows";

  const user = await getUser();
  const supabase = await createClient();

  const [shows, movies, usersRes, followingRes] = q
    ? await Promise.all([
        tvmaze.searchShows(q).catch(() => null),
        cinemeta.searchMovies(q).catch(() => null),
        supabase.rpc("fn_search_users", { p_query: q, p_limit: 30 }),
        user
          ? supabase
              .from("follows")
              .select("followee_id")
              .eq("follower_id", user.id)
          : Promise.resolve({ data: [] as { followee_id: string }[] }),
      ])
    : [null, null, { data: null }, { data: [] }];

  const people = (usersRes.data ?? []).filter((u) => u.id !== user?.id);
  const followingIds = new Set(
    (followingRes.data ?? []).map((f) => f.followee_id),
  );

  const counts: Record<TabKey, number> = {
    shows: shows?.length ?? 0,
    movies: movies?.length ?? 0,
    people: people.length,
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Search</h1>
      <SearchInput initialQuery={q} />

      {q ? (
        <>
          <nav aria-label="Result type" className="flex gap-1 border-b">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={`/search?q=${encodeURIComponent(q)}&tab=${t.key}`}
                aria-current={tab === t.key ? "page" : undefined}
                className={cn(
                  "border-b-2 px-3 py-2 text-sm font-medium",
                  tab === t.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {counts[t.key]}
                </span>
              </Link>
            ))}
          </nav>

          {tab === "shows" ? (
            counts.shows === 0 ? (
              <EmptyState
                icon={SearchX}
                title={`No shows for “${q}”`}
                description="Try a different spelling or a shorter query."
              />
            ) : (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {(shows ?? []).map(({ show: s }) => (
                  <MediaPoster
                    key={s.id}
                    href={`/shows/${s.id}`}
                    title={s.name}
                    posterUrl={posterUrl(s.image?.medium ?? s.image?.original ?? null)}
                    subtitle={s.premiered?.slice(0, 4) ?? null}
                  />
                ))}
              </div>
            )
          ) : null}

          {tab === "movies" ? (
            counts.movies === 0 ? (
              <EmptyState
                icon={SearchX}
                title={`No movies for “${q}”`}
                description="Try a different spelling or a shorter query."
              />
            ) : (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {(movies ?? []).map((m) => (
                  <MediaPoster
                    key={m.id}
                    href={`/movies/${m.imdb_id ?? m.id}`}
                    title={m.name}
                    posterUrl={posterUrl(m.poster ?? null)}
                    subtitle={m.releaseInfo?.slice(0, 4) ?? null}
                  />
                ))}
              </div>
            )
          ) : null}

          {tab === "people" ? (
            counts.people === 0 ? (
              <EmptyState
                icon={SearchX}
                title={`No people for “${q}”`}
                description="Usernames and display names are searchable."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {people.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Link href={`/profile/${p.username}`}>
                      <UserAvatar
                        username={p.username}
                        displayName={p.display_name}
                        avatarUrl={p.avatar_url}
                        className="size-10"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/profile/${p.username}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {p.display_name || p.username}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        @{p.username}
                      </p>
                    </div>
                    <FollowButton
                      followeeId={p.id}
                      username={p.username}
                      initialFollowing={followingIds.has(p.id)}
                      signedIn={!!user}
                    />
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </>
      ) : null}
    </div>
  );
}
