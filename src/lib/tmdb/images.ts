// TVmaze and Cinemeta return ABSOLUTE image URLs, which we store directly on the
// row. These helpers are now pass-through (the optional size arg is ignored) so
// existing call sites keep working without changes.

export function posterUrl(path: string | null, _size?: string): string | null {
  return path ?? null;
}

export function backdropUrl(path: string | null, _size?: string): string | null {
  return path ?? null;
}

export function stillUrl(path: string | null, _size?: string): string | null {
  return path ?? null;
}

import type { TvmazeImageSet } from "./types";

/** Pick a wide/landscape image for a cover — background first, then banner. */
export function pickLandscapeImage(images: TvmazeImageSet): string | null {
  const byType = (t: string) =>
    images.find((i) => i.type === t)?.resolutions?.original?.url ?? null;
  return byType("background") ?? byType("banner") ?? null;
}
