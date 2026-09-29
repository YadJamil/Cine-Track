-- Social: directed follow graph, comments, likes, reviews, reactions
create table public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  affinity numeric not null default 0,                   -- [ASSUMPTION A3] % show overlap
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id);

-- [ASSUMPTION A3] affinity = 100 * |shared followed shows| / |union of followed shows|
create function public.fn_affinity(p_a uuid, p_b uuid) returns numeric
language sql stable security definer set search_path = public as $$
  with a as (select show_id from public.user_shows where user_id = p_a and is_followed),
       b as (select show_id from public.user_shows where user_id = p_b and is_followed),
       shared as (select count(*) n from a join b using (show_id)),
       uni as (select count(*) n from (select show_id from a union select show_id from b) u)
  select case when uni.n = 0 then 0
              else round(100.0 * shared.n / uni.n, 1) end
  from shared, uni;
$$;

create function public.trg_set_affinity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.affinity := public.fn_affinity(new.follower_id, new.followee_id);
  return new;
end $$;
create trigger follows_set_affinity before insert on public.follows
  for each row execute function public.trg_set_affinity();

-- Nightly refresh of all edges (cron)
create function public.fn_refresh_affinities() returns void
language sql security definer set search_path = public as $$
  update public.follows f
  set affinity = public.fn_affinity(f.follower_id, f.followee_id);
$$;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_type public.media_type not null,
  show_id bigint references public.shows(id) on delete cascade,
  episode_id bigint references public.episodes(id) on delete cascade,
  movie_id bigint references public.movies(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  contains_spoiler boolean not null default false,       -- [ASSUMPTION A9]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ( (media_type='show' and show_id is not null and movie_id is null)
       or (media_type='movie' and movie_id is not null and show_id is null and episode_id is null) )
);
create index comments_episode_idx on public.comments (episode_id, created_at desc);
create index comments_show_idx on public.comments (show_id, created_at desc);
create index comments_movie_idx on public.comments (movie_id, created_at desc);
create index comments_user_idx on public.comments (user_id, created_at desc);
create trigger comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

create table public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_type public.media_type not null,
  show_id bigint references public.shows(id) on delete cascade,
  movie_id bigint references public.movies(id) on delete cascade,
  rating smallint not null check (rating between 1 and 10),
  body text check (char_length(body) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ( (media_type='show' and show_id is not null and movie_id is null)
       or (media_type='movie' and movie_id is not null and show_id is null) )
);
create unique index reviews_user_show_uq on public.reviews (user_id, show_id) where show_id is not null;
create unique index reviews_user_movie_uq on public.reviews (user_id, movie_id) where movie_id is not null;
create index reviews_show_idx on public.reviews (show_id, created_at desc);
create index reviews_movie_idx on public.reviews (movie_id, created_at desc);
create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

create table public.episode_reactions (                  -- [ASSUMPTION A6]
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id bigint not null references public.episodes(id) on delete cascade,
  reaction public.reaction_type not null,
  created_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);
create index episode_reactions_episode_idx on public.episode_reactions (episode_id);
