-- Lists (parity with lists-prod)
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text check (char_length(description) <= 1000),
  is_public boolean not null default false,              -- export default: false
  ordering int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
create trigger lists_updated_at before update on public.lists
  for each row execute function public.set_updated_at();

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  media_type public.media_type not null,
  show_id bigint references public.shows(id) on delete cascade,
  movie_id bigint references public.movies(id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now(),
  check ( (media_type='show' and show_id is not null and movie_id is null)
       or (media_type='movie' and movie_id is not null and show_id is null) )
);
create unique index list_items_show_uq on public.list_items (list_id, show_id) where show_id is not null;
create unique index list_items_movie_uq on public.list_items (list_id, movie_id) where movie_id is not null;
create index list_items_list_idx on public.list_items (list_id, position);
