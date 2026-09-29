// Pure title-matching rules for resolving TV Time export rows to provider shows.
// Kept free of server/network deps so the rules can be unit tested — see
// match.test.ts. The network tiers live in ./actions.ts.

/**
 * TV Time appends disambiguators that no provider carries: "Euphoria (US)",
 * "INVINCIBLE (2021)", "Raised by Wolves (2020)".
 */
const TV_TIME_SUFFIX = /\s*\((?:\d{4}|[A-Za-z]{2})\)\s*$/;

/** Strip TV Time's suffix; never returns empty (falls back to the input). */
export function cleanTitle(name: string): string {
  return name.replace(TV_TIME_SUFFIX, "").trim() || name.trim();
}

/** Comparable form: case- and punctuation-insensitive. */
export function squash(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * The part before a colon, or null when there is no subtitle to drop. Only used
 * as a last resort — TVmaze returns no results at all for some long subtitles
 * ("Demon Slayer: Kimetsu no Yaiba").
 */
export function subtitleHead(title: string): string | null {
  const head = title.split(":")[0]?.trim();
  return head && head !== title ? head : null;
}

/**
 * Pick a candidate whose title genuinely overlaps `target` (the squashed *full*
 * exported title). Exact wins; otherwise one title must be a prefix of the
 * other ("Arcane" → "Arcane: League of Legends", and the reverse for
 * "Demon Slayer: Kimetsu no Yaiba" → "Demon Slayer").
 *
 * Deliberately strict: a wrong match would graft a watch history onto the wrong
 * show, which is worse than skipping it.
 */
export function pickMatch<T extends { name: string }>(
  candidates: T[],
  target: string,
): T | null {
  return (
    candidates.find((c) => squash(c.name) === target) ??
    candidates.find((c) => {
      const candidate = squash(c.name);
      return candidate.startsWith(target) || target.startsWith(candidate);
    }) ??
    null
  );
}
