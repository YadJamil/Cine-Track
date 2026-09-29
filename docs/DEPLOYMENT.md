# Deployment (Vercel + Supabase)

Do Supabase first, then Vercel, then connect the two.

## 1. Before you start

Make sure the build works locally:

```bash
npm run typecheck && npm run lint && npm run build
```

Generate a production VAPID key pair and a push secret. Don't reuse the local
ones.

```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 2. Supabase

1. Create a project in the [dashboard](https://supabase.com/dashboard) and note
   the project URL, anon key and service_role key (Project Settings, API).
2. Under Database, Extensions, enable `pg_cron` and `pg_net`. The migrations
   skip them silently if they're missing, but then the cron jobs and push
   delivery just won't run.
3. Link the repo and push the migrations:
   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push
   ```
4. Under Authentication, URL Configuration, set the Site URL to your domain and
   add `https://<your-domain>/auth/callback` to the redirect list.
5. If you use Google or Apple sign-in, enable them under Providers and add
   `https://<project-ref>.supabase.co/auth/v1/callback` in the provider's
   console.

`supabase/config.toml` only applies to local development. Don't run
`supabase/seed.sql` against production.

## 3. Vercel

Import the GitHub repo. The Next.js defaults are fine. Add these environment
variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (server only) |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `VAPID_SUBJECT` | `mailto:you@example.com` |
| `PUSH_DISPATCH_SECRET` | the random secret from step 1 |

There are no media API keys. If you only learn the domain after the first
deploy, fix `NEXT_PUBLIC_SITE_URL` and the Supabase Site URL, then redeploy.

## 4. Connect push notifications

The `fn_dispatch_push` trigger reads its target from the `app_settings` table
and calls the app through `pg_net`. Run this in the Supabase SQL editor:

```sql
insert into public.app_settings (key, value) values
  ('push_dispatch_url', 'https://<your-domain>/api/push/dispatch'),
  ('push_dispatch_secret', '<same value as PUSH_DISPATCH_SECRET>')
on conflict (key) do update set value = excluded.value;
```

The two secrets have to match, otherwise the route returns 401.

## 5. Check it works

- Sign up and log in
- Mark an episode (tests RLS and writes)
- Upload an avatar (tests storage)
- Enable notifications and trigger one (check the Vercel logs for
  `/api/push/dispatch` and the Supabase logs for the `pg_net` call)
- Database, Cron Jobs should list the four scheduled jobs

## Optional

- A custom domain means updating `NEXT_PUBLIC_SITE_URL`, the Supabase Site URL
  and the OAuth redirect URLs, then redeploying.
- Preview deployments use the same env vars unless you point them at a staging
  project, so they would read and write production data.
- Turn on backups under Database, Backups.
