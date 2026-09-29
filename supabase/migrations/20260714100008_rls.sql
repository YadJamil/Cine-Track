-- RLS on every table. `(select auth.uid())` for initplan caching.
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.shows enable row level security;
alter table public.seasons enable row level security;
alter table public.episodes enable row level security;
alter table public.movies enable row level security;
alter table public.user_shows enable row level security;
alter table public.episode_watches enable row level security;
alter table public.movie_watches enable row level security;
alter table public.user_daily_connections enable row level security;
alter table public.show_addiction_scores enable row level security;
alter table public.follows enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.reviews enable row level security;
alter table public.episode_reactions enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.notifications enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.data_export_requests enable row level security;

-- profiles: private profile readable only by self; username resolvable via fn_search_users RPC
create policy profiles_select on public.profiles for select
  using (is_public or id = (select auth.uid()));
create policy profiles_update on public.profiles for update
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- user_settings: own only
create policy user_settings_select on public.user_settings for select using (user_id = (select auth.uid()));
create policy user_settings_insert on public.user_settings for insert with check (user_id = (select auth.uid()));
create policy user_settings_update on public.user_settings for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy user_settings_delete on public.user_settings for delete using (user_id = (select auth.uid()));

-- content cache: world-readable (incl. anon); writes only via service role (no policies)
create policy shows_select on public.shows for select using (true);
create policy seasons_select on public.seasons for select using (true);
create policy episodes_select on public.episodes for select using (true);
create policy movies_select on public.movies for select using (true);

-- owner-public pattern
create policy user_shows_select on public.user_shows for select
  using (user_id = (select auth.uid())
     or exists (select 1 from public.profiles p where p.id = user_id and p.is_public));
create policy user_shows_insert on public.user_shows for insert with check (user_id = (select auth.uid()));
create policy user_shows_update on public.user_shows for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy user_shows_delete on public.user_shows for delete using (user_id = (select auth.uid()));

create policy episode_watches_select on public.episode_watches for select
  using (user_id = (select auth.uid())
     or exists (select 1 from public.profiles p where p.id = user_id and p.is_public));
create policy episode_watches_insert on public.episode_watches for insert with check (user_id = (select auth.uid()));
create policy episode_watches_update on public.episode_watches for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy episode_watches_delete on public.episode_watches for delete using (user_id = (select auth.uid()));

create policy movie_watches_select on public.movie_watches for select
  using (user_id = (select auth.uid())
     or exists (select 1 from public.profiles p where p.id = user_id and p.is_public));
create policy movie_watches_insert on public.movie_watches for insert with check (user_id = (select auth.uid()));
create policy movie_watches_update on public.movie_watches for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy movie_watches_delete on public.movie_watches for delete using (user_id = (select auth.uid()));

create policy user_daily_connections_select on public.user_daily_connections for select
  using (user_id = (select auth.uid()));
create policy user_daily_connections_insert on public.user_daily_connections for insert
  with check (user_id = (select auth.uid()));

create policy show_addiction_scores_select on public.show_addiction_scores for select
  using (user_id = (select auth.uid()));

-- follow graph is public
create policy follows_select on public.follows for select using (true);
create policy follows_insert on public.follows for insert with check (follower_id = (select auth.uid()));
create policy follows_delete on public.follows for delete using (follower_id = (select auth.uid()));

create policy comments_select on public.comments for select using (true);
create policy comments_insert on public.comments for insert with check (user_id = (select auth.uid()));
create policy comments_update on public.comments for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy comments_delete on public.comments for delete using (user_id = (select auth.uid()));

create policy comment_likes_select on public.comment_likes for select using (true);
create policy comment_likes_insert on public.comment_likes for insert with check (user_id = (select auth.uid()));
create policy comment_likes_delete on public.comment_likes for delete using (user_id = (select auth.uid()));

create policy reviews_select on public.reviews for select using (true);
create policy reviews_insert on public.reviews for insert with check (user_id = (select auth.uid()));
create policy reviews_update on public.reviews for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy reviews_delete on public.reviews for delete using (user_id = (select auth.uid()));

create policy episode_reactions_select on public.episode_reactions for select
  using (user_id = (select auth.uid())
     or exists (select 1 from public.profiles p where p.id = user_id and p.is_public));
create policy episode_reactions_insert on public.episode_reactions for insert with check (user_id = (select auth.uid()));
create policy episode_reactions_update on public.episode_reactions for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy episode_reactions_delete on public.episode_reactions for delete using (user_id = (select auth.uid()));

create policy lists_select on public.lists for select
  using (is_public or user_id = (select auth.uid()));
create policy lists_insert on public.lists for insert with check (user_id = (select auth.uid()));
create policy lists_update on public.lists for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy lists_delete on public.lists for delete using (user_id = (select auth.uid()));

create policy list_items_select on public.list_items for select
  using (exists (select 1 from public.lists l where l.id = list_id
                 and (l.is_public or l.user_id = (select auth.uid()))));
create policy list_items_insert on public.list_items for insert
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));
create policy list_items_update on public.list_items for update
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));
create policy list_items_delete on public.list_items for delete
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())));

-- notifications: inserts happen in definer triggers only; clients may only flip `read`
create policy notifications_select on public.notifications for select using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications for delete using (user_id = (select auth.uid()));
-- column-level: authenticated users can update ONLY the read flag
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke update on public.notifications from authenticated;
    grant update (read) on public.notifications to authenticated;
  end if;
end $$;

create policy badges_select on public.badges for select using (true);

create policy user_badges_select on public.user_badges for select
  using (user_id = (select auth.uid())
     or exists (select 1 from public.profiles p where p.id = user_id and p.is_public));

create policy data_export_requests_select on public.data_export_requests for select
  using (user_id = (select auth.uid()));
create policy data_export_requests_insert on public.data_export_requests for insert
  with check (user_id = (select auth.uid()));
