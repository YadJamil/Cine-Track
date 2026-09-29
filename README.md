# CineTrack

A TV Time style tracker for shows and movies. Mark episodes as watched, see
what to watch next, check the calendar for upcoming episodes, and follow
friends.

The schema is modelled on a TV Time GDPR data export, so some of the odd
behaviour (like marking episode 5 also marking 1-4) matches the original app.

**Stack:** Next.js 15 (App Router), TypeScript, Supabase (Postgres, Auth,
Storage, Realtime), Tailwind 4 + shadcn/ui. Show data comes from TVmaze and
movie data from Cinemeta. Neither needs an API key.

## What it does

- Track episodes one by one, per season, or with "fill previous"; undo;
  favorites; unfollow without losing history
- Watch Next home page, calendar, explore, and search (Cmd+K)
- Follows with an affinity score, comments, reviews, episode reactions, and an
  activity feed
- Notifications (in-app and web push) and airing reminders
- Profile stats: hours watched, streaks, marathons, badges
- Lists, settings, and a GDPR data export
- Installable as a PWA, with an Android wrapper in `android/`

## Setup

You need Node 20+, the [Supabase CLI](https://supabase.com/docs/guides/cli) and
Docker.

```bash
cp .env.example .env.local
supabase start        # prints the local anon and service_role keys
```

Paste those keys into `.env.local`, then load the schema and start the app:

```bash
supabase db reset     # runs the migrations and supabase/seed.sql
npm install
npm run dev
```

For some demo data (a few shows and three users with watches, follows and
comments), run `npm run seed`. You can then log in as
`naza@cinetrack.demo` / `cinetrack-demo-1234`.

## Scripts

| Command | |
|---|---|
| `npm run dev` | dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:db` | replays every migration on plain Postgres and runs `scripts/db-smoke-test.sql` (needs `psql`, no Docker) |
| `npm run e2e` | Playwright, needs the app and local Supabase running |

## Project layout

```
src/app          routes, split into (app), (auth) and (onboarding) groups
src/features     one folder per domain: actions, queries, components
src/components   shared UI; ui/ is shadcn
src/lib          Supabase clients, media providers, env validation, helpers
supabase         migrations, config, seed
scripts          seeding, DB smoke test, icon/avatar generators
e2e              Playwright specs
docs             decisions, TODO, deployment
android          Capacitor wrapper
```

`src/lib/tmdb` holds the TVmaze/Cinemeta clients. The name is left over from
an early TMDB version.

## How it works

- Counters (episodes watched, time spent, streaks) are never stored. They are
  computed from the base tables by views and functions, so they can't drift.
- Every table has RLS. Show and movie metadata is cached in Postgres on first
  visit and only written by the service role.
- Mutations are Server Actions that validate input with Zod and return a
  `Result<T>`.
- Shows and movies are addressed in URLs by their provider id (TVmaze id for
  shows, IMDb id for movies). See `docs/ASSUMPTIONS.md`.

## Scheduled jobs

These are set up automatically on hosted Supabase, where `pg_cron` is
available. Locally, call the functions by hand.

| Job | Schedule | Function |
|---|---|---|
| Addiction scores | hourly | `fn_recompute_addiction_scores()` |
| Affinity refresh | daily, 03:00 | `fn_refresh_affinities()` |
| Trending | every 6 hours | `fn_refresh_trending()` |
| Airing reminders | daily, 06:00 | `fn_notify_airing_episodes()` |

Deployment steps are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), known gaps
in [`docs/TODO.md`](docs/TODO.md).
