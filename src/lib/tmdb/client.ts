import "server-only";
import { z } from "zod";
import {
  cinemetaCatalogSchema,
  cinemetaMetaResponseSchema,
  tvmazeImageSetSchema,
  tvmazeSearchSchema,
  tvmazeShowSchema,
  tvmazeShowWithEmbedSchema,
  type CinemetaMeta,
  type TvmazeImageSet,
  type TvmazeShow,
  type TvmazeShowWithEmbed,
} from "./types";



// Keyless providers: TVmaze for TV (api.tvmaze.com), Cinemeta for movies
// (v3-cinemeta.strem.io). Neither needs an API key.
const TVMAZE = "https://api.tvmaze.com";
const CINEMETA = "https://v3-cinemeta.strem.io";

export class MediaError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "MediaError";
  }
}
// Back-compat alias: show/movie pages still catch `TmdbError` for 404 handling.
export { MediaError as TmdbError };

async function getJson<T>(
  url: string,
  schema: z.ZodType<T>,
  revalidate = 3600,
): Promise<T> {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) {
    throw new MediaError(res.status, `Upstream ${res.status} for ${url}`);
  }
  return schema.parse(await res.json());
}

export const tvmaze = {
  // One embedded call fetches show + seasons + episodes (rate-limit friendly).
  showDetails: (id: number): Promise<TvmazeShowWithEmbed> =>
    getJson(
      `${TVMAZE}/shows/${id}?embed[]=episodes&embed[]=seasons&embed[]=images`,
      tvmazeShowWithEmbedSchema,
    ),

  // Lightweight show fetch (no episodes/seasons) for pickers/lists.
  showSummary: (id: number): Promise<TvmazeShow> =>
    getJson(`${TVMAZE}/shows/${id}`, tvmazeShowSchema),

  // All artwork for a show — the base show object has no landscape backdrop, so
  // this is how we get a wide "background" image for profile covers.
  showImages: (id: number): Promise<TvmazeImageSet> =>
    getJson(`${TVMAZE}/shows/${id}/images`, tvmazeImageSetSchema, 86400),

  // Exact resolve by TheTVDB id — what TV Time exports key shows by, and far
  // more reliable than its display names. 404 → null.
  lookupByTvdb: async (tvdbId: number): Promise<TvmazeShow | null> => {
    const res = await fetch(`${TVMAZE}/lookup/shows?thetvdb=${tvdbId}`, {
      next: { revalidate: 86400 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new MediaError(res.status, `TVmaze ${res.status}`);
    return tvmazeShowSchema.parse(await res.json());
  },

  // Best single match by name (used to resolve TV Time export rows). 404 → null.
  singleSearchShow: async (query: string): Promise<TvmazeShow | null> => {
    const res = await fetch(
      `${TVMAZE}/singlesearch/shows?q=${encodeURIComponent(query)}`,
      { next: { revalidate: 3600 } },
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new MediaError(res.status, `TVmaze ${res.status}`);
    return tvmazeShowSchema.parse(await res.json());
  },

  searchShows: (query: string) =>
    getJson(
      `${TVMAZE}/search/shows?q=${encodeURIComponent(query)}`,
      tvmazeSearchSchema,
      300,
    ),
};

export const cinemeta = {
  movieDetails: async (imdbId: string): Promise<CinemetaMeta> => {
    const { meta } = await getJson(
      `${CINEMETA}/meta/movie/${imdbId}.json`,
      cinemetaMetaResponseSchema,
    );
    if (!meta) throw new MediaError(404, `Movie ${imdbId} not found`);
    return meta;
  },

  searchMovies: (query: string) =>
    getJson(
      `${CINEMETA}/catalog/movie/top/search=${encodeURIComponent(query)}.json`,
      cinemetaCatalogSchema,
      300,
    ).then((c) => c.metas),

  popularMovies: () =>
    getJson(`${CINEMETA}/catalog/movie/top.json`, cinemetaCatalogSchema).then(
      (c) => c.metas,
    ),

  moviesByGenre: (genre: string) =>
    getJson(
      `${CINEMETA}/catalog/movie/top/genre=${encodeURIComponent(genre)}.json`,
      cinemetaCatalogSchema,
    ).then((c) => c.metas),
};
