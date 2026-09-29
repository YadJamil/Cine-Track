-- Notifications, badges, GDPR
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,   -- recipient
  type public.notification_type not null,
  title text,
  body text,
  actors jsonb not null default '[]',                    -- [{id,type,name,avatar_url}] like export 'objects'
  data jsonb not null default '{}',                      -- deep-link params
  url text,                                              -- in-app route
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read, created_at desc);

create table public.badges (
  id text primary key,                                   -- 'first_episode', 'streak_7', ...
  name text not null,
  description text not null,
  icon text not null,
  sort int not null default 0
);

create table public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table public.data_export_requests (               -- gdpr_requests parity
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','done','error')),
  storage_path text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger data_export_requests_updated_at before update on public.data_export_requests
  for each row execute function public.set_updated_at();

-- [ASSUMPTION A10] Badge catalog (export only proves a counter + unlock toggle)
insert into public.badges (id, name, description, icon, sort) values
  ('first_episode',        'First Step',      'Watch your first episode',                 'play',      10),
  ('ep_100',               'Century',         'Watch 100 episodes',                       'award',     20),
  ('ep_1000',              'Binge Lord',      'Watch 1,000 episodes',                     'crown',     30),
  ('first_show_completed', 'Finisher',        'Watch every aired episode of a show',      'check',     40),
  ('marathon_10',          'Marathoner',      'Watch 10+ episodes of one show in a day',  'zap',       50),
  ('streak_7',             'One Week Streak', 'Open Episode 7 days in a row',             'flame',     60),
  ('streak_30',            'One Month Streak','Open Episode 30 days in a row',            'flame',     70),
  ('first_friend',         'Social Animal',   'Follow your first friend',                 'users',     80),
  ('first_review',         'Critic',          'Write your first review',                  'star',      90),
  ('night_owl',            'Night Owl',       'Watch an episode between midnight and 4am','moon',     100);

-- Actor payload helper
create or replace function public.fn_actor_jsonb(p_user_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'type', 'user',
    'name', coalesce(p.display_name, p.username::text),
    'username', p.username::text,
    'avatar_url', p.avatar_url)), '[]'::jsonb)
  from public.profiles p where p.id = p_user_id;
$$;

-- Real badge evaluator (replaces the tracking-migration placeholder)
create or replace function public.fn_check_badges(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ep_count bigint;
  v_tz text;
  v_max_streak int;
  v_completed boolean;
  v_marathon boolean;
  v_night_owl boolean;
begin
  select count(*) into v_ep_count from public.episode_watches where user_id = p_user_id;
  select coalesce(timezone, 'UTC') into v_tz from public.user_settings where user_id = p_user_id;
  v_tz := coalesce(v_tz, 'UTC');

  select exists (
    select 1 from public.user_shows us
    join lateral (
      select count(*) c from public.episodes e
      where e.show_id = us.show_id and e.season_number > 0 and e.air_date <= current_date
    ) aired on true
    join lateral (
      select count(*) c from public.episode_watches w
      where w.user_id = us.user_id and w.show_id = us.show_id
    ) seen on true
    where us.user_id = p_user_id and aired.c > 0 and seen.c >= aired.c
  ) into v_completed;

  select exists (
    select 1 from public.episode_watches w
    where w.user_id = p_user_id
    group by w.show_id, (w.watched_at at time zone v_tz)::date
    having count(*) >= 10
  ) into v_marathon;

  select coalesce(max(cnt), 0) into v_max_streak from (
    select count(*) cnt from (
      select day, day - (row_number() over (order by day))::int as grp
      from public.user_daily_connections where user_id = p_user_id
    ) t group by grp
  ) s;

  select exists (
    select 1 from public.episode_watches w
    where w.user_id = p_user_id
      and extract(hour from w.watched_at at time zone v_tz) < 4
  ) into v_night_owl;

  insert into public.user_badges (user_id, badge_id)
  select p_user_id, x.id
  from (values
    ('first_episode',        v_ep_count >= 1),
    ('ep_100',               v_ep_count >= 100),
    ('ep_1000',              v_ep_count >= 1000),
    ('first_show_completed', v_completed),
    ('marathon_10',          v_marathon),
    ('streak_7',             v_max_streak >= 7),
    ('streak_30',            v_max_streak >= 30),
    ('first_friend',         exists (select 1 from public.follows f where f.follower_id = p_user_id)),
    ('first_review',         exists (select 1 from public.reviews r where r.user_id = p_user_id)),
    ('night_owl',            v_night_owl)
  ) as x(id, earned)
  where x.earned
  on conflict do nothing;
end $$;

-- ── Notification fan-out (each respects the recipient's settings toggles) ──

create or replace function public.trg_notify_comment_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  v_url text;
begin
  select c.user_id,
         case when c.episode_id is not null then '/episodes/' || c.episode_id
              when c.media_type = 'show' then '/shows/' || c.show_id
              else '/movies/' || c.movie_id end
    into v_author, v_url
  from public.comments c where c.id = new.comment_id;

  if v_author is not null and v_author <> new.user_id
     and exists (select 1 from public.user_settings s
                 where s.user_id = v_author and s.notify_comment_likes) then
    insert into public.notifications (user_id, type, title, body, actors, data, url)
    values (v_author, 'comment_like', 'New like',
            'liked your comment',
            public.fn_actor_jsonb(new.user_id),
            jsonb_build_object('comment_id', new.comment_id),
            v_url);
  end if;
  return new;
end $$;
create trigger comment_likes_notify after insert on public.comment_likes
  for each row execute function public.trg_notify_comment_like();

-- [ASSUMPTION] scope: followers of the commenter get 'friend_comment'
create or replace function public.trg_notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_url text := case when new.episode_id is not null then '/episodes/' || new.episode_id
                     when new.media_type = 'show' then '/shows/' || new.show_id
                     else '/movies/' || new.movie_id end;
begin
  insert into public.notifications (user_id, type, title, body, actors, data, url)
  select f.follower_id, 'friend_comment', 'New comment',
         left(new.body, 140),
         public.fn_actor_jsonb(new.user_id),
         jsonb_build_object('comment_id', new.id),
         v_url
  from public.follows f
  join public.user_settings s on s.user_id = f.follower_id and s.notify_friend_comments
  where f.followee_id = new.user_id;
  return new;
end $$;
create trigger comments_notify after insert on public.comments
  for each row execute function public.trg_notify_comment();

create or replace function public.trg_notify_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.user_settings s
             where s.user_id = new.followee_id and s.notify_new_followers) then
    insert into public.notifications (user_id, type, title, body, actors, data, url)
    select new.followee_id, 'new_follower', 'New follower',
           'started following you',
           public.fn_actor_jsonb(new.follower_id),
           jsonb_build_object('follower_id', new.follower_id),
           '/profile/' || p.username
    from public.profiles p where p.id = new.follower_id;
  end if;
  return new;
end $$;
create trigger follows_notify after insert on public.follows
  for each row execute function public.trg_notify_follow();

create or replace function public.trg_notify_badge() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.user_settings s
             where s.user_id = new.user_id and s.notify_badge_unlocks) then
    insert into public.notifications (user_id, type, title, body, actors, data, url)
    select new.user_id, 'badge_unlock', 'Badge unlocked: ' || b.name, b.description,
           '[]'::jsonb,
           jsonb_build_object('badge_id', b.id, 'icon', b.icon),
           '/profile/' || (select username from public.profiles where id = new.user_id) || '?tab=badges'
    from public.badges b where b.id = new.badge_id;
  end if;
  return new;
end $$;
create trigger user_badges_notify after insert on public.user_badges
  for each row execute function public.trg_notify_badge();

-- Daily cron: air-date reminders honoring airing_offset_minutes + exclusions
create or replace function public.fn_notify_airing_episodes() returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, title, body, actors, data, url)
  select us.user_id, 'episode_airing',
         s.name || ' — S' || e.season_number || 'E' || e.episode_number,
         case when e.air_date = current_date then 'airs today' else 'airs ' || e.air_date::text end,
         '[]'::jsonb,
         jsonb_build_object('episode_id', e.id, 'show_id', s.id),
         '/episodes/' || e.id
  from public.user_shows us
  join public.user_settings st on st.user_id = us.user_id and st.notify_episode_airing
  join public.shows s on s.id = us.show_id
  join public.episodes e on e.show_id = s.id
  where us.is_followed and not us.is_archived
    and e.air_date = current_date + (st.airing_offset_minutes / 1440)
    and not us.show_id = any (st.excluded_show_ids)
    and not exists (
      select 1 from public.notifications n
      where n.user_id = us.user_id and n.type = 'episode_airing'
        and (n.data->>'episode_id')::bigint = e.id
    );
$$;

-- Live badge counter: expose notifications over Realtime where available
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
