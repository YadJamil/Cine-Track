-- Content cache (TMDB mirror). Written server-side only (service role).
create table public.shows (
  id bigint generated always as identity primary key,
  tmdb_id int not null unique,
  name text not null,
  original_name text,
  overview text,
  poster_path text,
  backdrop_path text,
  first_air_date date,
  status text,                                         -- 'Returning Series' | 'Ended' | ...
  in_production boolean,
  episode_runtime int,                                 -- minutes, default fallback
  genres jsonb not null default '[]',
  networks jsonb not null default '[]',                -- for excluded_networks parity
  origin_country text[],
  original_language text,
  number_of_seasons int,
  number_of_episodes int,
  popularity numeric,
  vote_average numeric,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index shows_name_trgm_idx on public.shows using gin (name gin_trgm_ops);

alter table public.profiles add constraint profiles_cover_show_fk
  foreign key (cover_show_id) references public.shows(id) on delete set null;

create table public.seasons (
  id bigint generated always as identity primary key,
  show_id bigint not null references public.shows(id) on delete cascade,
  tmdb_id int unique,
  season_number int not null,
  name text,
  overview text,
  poster_path text,
  air_date date,
  episode_count int,
  unique (show_id, season_number)
);

create table public.episodes (
  id bigint generated always as identity primary key,
  show_id bigint not null references public.shows(id) on delete cascade,
  season_id bigint references public.seasons(id) on delete cascade,
  tmdb_id int unique,
  season_number int not null,
  episode_number int not null,
  name text,
  overview text,
  still_path text,
  air_date date,
  runtime int,                                          -- minutes
  unique (show_id, season_number, episode_number)
);
create index episodes_show_air_idx on public.episodes (show_id, air_date);
create index episodes_air_idx on public.episodes (air_date);

create table public.movies (
  id bigint generated always as identity primary key,
  tmdb_id int not null unique,
  title text not null,
  original_title text,
  overview text,
  poster_path text,
  backdrop_path text,
  release_date date,
  runtime int,                                          -- minutes
  genres jsonb not null default '[]',
  popularity numeric,
  vote_average numeric,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index movies_title_trgm_idx on public.movies using gin (title gin_trgm_ops);
