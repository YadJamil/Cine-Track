-- Storage buckets + object policies (skipped when storage schema is absent,
-- e.g. plain-Postgres CI; always present on Supabase).
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'storage schema absent — skipping bucket setup';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
    ('avatars', 'avatars', true,  2097152, array['image/png','image/jpeg','image/webp','image/avif']),
    ('covers',  'covers',  true,  4194304, array['image/png','image/jpeg','image/webp','image/avif']),
    ('exports', 'exports', false, null,    null)
  on conflict (id) do nothing;

  -- public read for image buckets
  execute $p$create policy "episode_public_image_read" on storage.objects for select
    using (bucket_id in ('avatars','covers'))$p$;

  -- users write only under their own folder: {auth.uid()}/...
  execute $p$create policy "episode_own_image_insert" on storage.objects for insert to authenticated
    with check (bucket_id in ('avatars','covers') and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  execute $p$create policy "episode_own_image_update" on storage.objects for update to authenticated
    using (bucket_id in ('avatars','covers') and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  execute $p$create policy "episode_own_image_delete" on storage.objects for delete to authenticated
    using (bucket_id in ('avatars','covers') and (storage.foldername(name))[1] = auth.uid()::text)$p$;

  -- exports: private; users read their own folder (signed URLs), service role writes
  execute $p$create policy "episode_own_export_read" on storage.objects for select to authenticated
    using (bucket_id = 'exports' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
end $$;
