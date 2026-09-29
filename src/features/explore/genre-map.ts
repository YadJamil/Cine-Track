// TVmaze and Cinemeta don't always spell the same genre the same way. Most
// words already match (Drama, Comedy, Action, Horror, Romance, Thriller,
// Crime, Mystery, Fantasy, Animation, Family, History, Music, War, Western,
// Documentary) — this only needs to cover the known mismatches. Cinemeta's
// spelling is the key; TVmaze's (used as the canonical/display form) is the
// value.
const CINEMETA_TO_CANONICAL: Record<string, string> = {
  "Sci-Fi": "Science-Fiction",
  Sport: "Sports",
};

const CANONICAL_TO_CINEMETA: Record<string, string> = Object.fromEntries(
  Object.entries(CINEMETA_TO_CANONICAL).map(([cinemeta, canonical]) => [
    canonical,
    cinemeta,
  ]),
);

/** Raw genre string from either provider -> canonical (TVmaze) spelling. */
export function toCanonical(raw: string): string {
  return CINEMETA_TO_CANONICAL[raw] ?? raw;
}

/** Canonical spelling -> Cinemeta's spelling, for querying their catalog. */
export function toCinemetaSpelling(canonical: string): string {
  return CANONICAL_TO_CINEMETA[canonical] ?? canonical;
}

export function genreSlug(genre: string): string {
  return genre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// The genre vocabulary /explore/genre/[slug] resolves against — broad enough
// to cover what a real affinity profile can produce, in canonical (TVmaze)
// spelling. Slugs outside this list 404 rather than silently querying an
// unrecognized genre string.
export const KNOWN_GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Science-Fiction",
  "Sports",
  "Thriller",
  "War",
  "Western",
];

/** Resolves a URL slug back to a genre, only if it's one we actually offer. */
export function genreFromSlug(slug: string): string | null {
  return KNOWN_GENRES.find((g) => genreSlug(g) === slug) ?? null;
}
