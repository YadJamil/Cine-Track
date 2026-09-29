-- Web Push: store browser push subscriptions and fan a notification out to them
-- automatically when it is created.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,   -- the browser's push endpoint (also the natural key)
  p256dh text not null,            -- client public key (from the PushSubscription)
  auth text not null,              -- client auth secret
  user_agent text,                 -- so a user can tell their devices apart
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy push_sub_select on public.push_subscriptions
  for select using (user_id = (select auth.uid()));
create policy push_sub_insert on public.push_subscriptions
  for insert with check (user_id = (select auth.uid()));
create policy push_sub_update on public.push_subscriptions
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_sub_delete on public.push_subscriptions
  for delete using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

-- Server-only config for the dispatcher (endpoint URL + shared secret). RLS is on
-- with no policies, so anon/authenticated can never read it; the definer trigger
-- below and the service role are the only readers.
create table public.app_settings (
  key text primary key,
  value text not null
);
alter table public.app_settings enable row level security;
grant all on public.app_settings to service_role;

-- After a notification is inserted, ping the app to fan it out as Web Push.
-- No-ops safely when pg_net is absent or the dispatcher isn't configured — push
-- must never be able to make notification creation fail.
create or replace function public.fn_dispatch_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_secret text;
begin
  if to_regproc('net.http_post') is null then
    return new; -- pg_net not installed
  end if;
  select value into v_url from public.app_settings where key = 'push_dispatch_url';
  if v_url is null then
    return new; -- dispatcher not configured
  end if;
  select value into v_secret from public.app_settings where key = 'push_dispatch_secret';

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-push-secret', coalesce(v_secret, '')
    )
  );
  return new;
end $$;

create trigger notifications_dispatch_push
  after insert on public.notifications
  for each row execute function public.fn_dispatch_push();
