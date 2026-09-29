# Assumptions and decisions

`A` entries are product guesses where the TV Time export didn't say. `D`
entries are implementation choices.

| # | Decision | Notes |
|---|---|---|
| A1 | Metadata comes from TVmaze (TV) and Cinemeta (movies) | Started on TMDB, switched to keyless providers. The export uses TheTVDB ids, which we don't use. |
| A2 | A `show` bulk-watch mode exists | Only `unitary`, `season` and `fill-previous` appear in the export. `show` is the "mark whole series" case. |
| A3 | Affinity is the % overlap of followed shows | `100 * shared / union`. Updated when someone follows and again nightly. |
| A4 | Addiction score: daily `min(100, watches_24h * 35)`, weekly `* 12` over 7 days, monthly `* 4` over 30 days | The export only showed "2-3 watches gives 35". The rest is a guess. Hourly cron. |
| A5 | Marathon = most episodes of one show in one UTC day | Top 5 shows by that count. |
| A6 | Six episode reactions: good, fun, wow, sad, soso, bad | From the original app, not the export. One per user per episode. |
| A7 | Onboarding needs age 16+ and at least 3 shows | 18 suggested shows, as in the export. |
| A8 | Feed groups a user's watches of one show into one event when gaps are 60 minutes or less | "watched 8 episodes of Arcane". |
| A9 | Spoilers: synopsis is blurred until the episode is watched; flagged comments blur until tapped | |
| A10 | Badges: first_episode, ep_100, ep_1000, first_show_completed, marathon_10, streak_7, streak_30, first_friend, first_review, night_owl | Checked by `fn_check_badges` after watch, follow and review actions. |
| A11 | Show, movie, episode and profile pages are public | Changes need a login. |
| A12 | No memes, cross-posting or ad/attribution tracking | Left out on purpose. |
| D1 | URLs use the provider id (TVmaze for shows, IMDb for movies); episodes use the local id | Lets search and explore link to a title before it's cached. Joins still use local ids, and `getOrCacheShow` fills the cache on first visit. |
| D2 | Derived views also return the provider id (`tmdb_id`, kept from the TMDB days) | Needed for the D1 links. |
| D3 | Unaired episodes can't be marked | Null air dates can, after a confirm dialog. Future dates are rejected in the RPC. |
| D4 | `friend_comment` notifications go to the commenter's followers | Not visible in the export. |
| D5 | Clients can only update `notifications.read` | Column-level `GRANT UPDATE (read)`. |
| D6 | The feed shows you and the public profiles you follow | Private users never appear, even to their followers. |
| D7 | Rate limits: 5 comments/min and 3 reviews/min per user | Counted from the table itself, no extra infrastructure. |
| D8 | Daily connections are logged in middleware, once a day via a cookie | Used for streaks. |
| D9 | List reorder uses up/down buttons | Same `position` column a drag UI would use. |
| D10 | GDPR export runs inside the server action | Data is small. Download link is a 5 minute signed URL. |
| D11 | Current streak and the addiction card are only shown to the profile owner | Their tables are owner-only under RLS. |
| D12 | Airing reminders use `air_date = today + floor(offset / 1440)` | There's no air time, so 1h and 6h offsets act as "airs today". One reminder per user and episode. |
| D13 | Trending = `follows * 3 + watchers * 2 + watches` over 7 days | Materialized view, refreshed every 6 hours. |
| D14 | Season page at `/shows/[id]/seasons/[n]` | Same episode list and bulk actions as the accordion on the show page. |
