// Pure scoring functions for the Explore recommendation algorithm — no I/O,
// so this is fully unit-testable in isolation from Supabase/providers. See
// scoring.test.ts and the "Algorithm" section of the Explore redesign plan
// for the reasoning behind the formula and weights.

export const WEIGHTS = { genre: 0.45, pop: 0.25, trend: 0.15, rating: 0.15 } as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Exponential decay, halving every `halfLife` days. */
export function recencyDecay(daysSince: number, halfLife = 45): number {
  return 2 ** (-daysSince / halfLife);
}

/** reviews.rating is 0–10; unrated titles contribute nothing either way. */
export function ratingBonus(rating: number | null | undefined): number {
  if (rating == null) return 0;
  return clamp((rating - 5.5) / 4.5, -1, 1);
}

/** show_addiction_scores.weekly_score; movies (and untouched shows) get 0. */
export function addictionBonus(weeklyScore: number | null | undefined): number {
  if (weeklyScore == null) return 0;
  return clamp(weeklyScore / 100, 0, 1);
}

export type WatchSignalInput = {
  genres: string[];
  lastWatchedAt: string;
  rating?: number | null;
  addictionWeeklyScore?: number | null;
};

/** How strongly one watched title should count toward its genres. */
export function titleSignal(input: WatchSignalInput, now: Date = new Date()): number {
  const daysSince = Math.max(0, (now.getTime() - new Date(input.lastWatchedAt).getTime()) / MS_PER_DAY);
  return Math.max(
    0,
    recencyDecay(daysSince) + ratingBonus(input.rating) + addictionBonus(input.addictionWeeklyScore),
  );
}

/**
 * Aggregates watch signals into a genre-affinity map, normalized so the
 * strongest genre is exactly 1. A title with multiple genres contributes its
 * full signal to each of them (a Drama+Crime show signals interest in both).
 */
export function buildGenreAffinity(
  signals: WatchSignalInput[],
  now: Date = new Date(),
): Map<string, number> {
  const raw = new Map<string, number>();
  for (const signal of signals) {
    const strength = titleSignal(signal, now);
    if (strength <= 0) continue;
    for (const genre of signal.genres) {
      raw.set(genre, (raw.get(genre) ?? 0) + strength);
    }
  }
  const max = Math.max(0, ...raw.values());
  if (max === 0) return new Map();
  return new Map([...raw.entries()].map(([genre, value]) => [genre, value / max]));
}

/** Top-k genres at or above `threshold`, strongest first. */
export function topGenres(
  affinity: Map<string, number>,
  k = 3,
  threshold = 0.2,
): string[] {
  return [...affinity.entries()]
    .filter(([, value]) => value >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([genre]) => genre);
}

/**
 * Percentile-ranks items by popularity within the given pool (top = 1,
 * bottom = 0) — shows' TVmaze `weight` and "position in a Cinemeta catalog
 * response" have no comparable absolute scale, so relative rank within
 * whatever's actually being displayed is the only fair comparison. Items
 * with no popularity value at all always rank 0, regardless of position.
 */
export function popularityRanks<T>(
  items: T[],
  popularityOf: (item: T) => number | null,
): Map<T, number> {
  const ranks = new Map<T, number>();
  const n = items.length;
  if (n === 0) return ranks;
  const sorted = [...items].sort(
    (a, b) => (popularityOf(b) ?? -Infinity) - (popularityOf(a) ?? -Infinity),
  );
  sorted.forEach((item, index) => {
    if (popularityOf(item) == null) {
      ranks.set(item, 0);
      return;
    }
    ranks.set(item, n > 1 ? 1 - index / (n - 1) : 1);
  });
  return ranks;
}

export type ScoreCandidateInput = {
  genres: string[];
  popularityRank: number;
  voteAverage: number | null;
  trendScore?: number | null;
};

/** Combines genre affinity, popularity, trend and rating into one 0–1ish score. */
export function scoreCandidate(
  c: ScoreCandidateInput,
  affinity: Map<string, number>,
  maxTrend: number,
): number {
  const genreTerm = Math.max(0, ...c.genres.map((g) => affinity.get(g) ?? 0));
  const popTerm = clamp(c.popularityRank, 0, 1);
  const trendTerm = maxTrend > 0 ? clamp((c.trendScore ?? 0) / maxTrend, 0, 1) : 0;
  const ratingTerm = c.voteAverage != null ? clamp(c.voteAverage / 10, 0, 1) : 0;
  return (
    WEIGHTS.genre * genreTerm +
    WEIGHTS.pop * popTerm +
    WEIGHTS.trend * trendTerm +
    WEIGHTS.rating * ratingTerm
  );
}
