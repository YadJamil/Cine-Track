# TODO

- **Memes:** in the export but out of scope (A12).
- **List reorder:** up/down buttons instead of drag and drop (D9). Drag would
  mean adding a DnD library.
- **CI:** there isn't any. Unit tests, lint and typecheck should run on every
  push. The Playwright specs need the local Supabase stack, so they only run by
  hand for now.
- **DB types:** `src/lib/supabase/database.types.ts` is maintained by hand.
  Switch to `supabase gen types` and diff.
- **Onboarding:** following a very long show (30+ seasons) caches every episode
  up front and can take a few seconds. A background job would fix that.
- **Explore:** rows are capped rails with no "See all" page.
- **Airing reminders:** date-based only (D12). Neither TVmaze nor Cinemeta gives
  an air time.
- **Comments:** no reporting, and only the latest 50 per item are loaded.
  Add cursor pagination.
- **Rename `src/lib/tmdb`** to something provider-neutral, and the `tmdb_id`
  columns with it (they now hold TVmaze ids).
