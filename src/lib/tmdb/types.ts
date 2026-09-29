import { z } from "zod";

// Provider responses are parsed, never trusted. Unknown fields are dropped.
// TV → TVmaze (https://api.tvmaze.com). Movies → Cinemeta (v3-cinemeta.strem.io).

// ─────────────────────────────── TVmaze ────────────────────────────────

const tvmazeImageSchema = z
  .object({ medium: z.string().nullish(), original: z.string().nullish() })
  .nullish();

const tvmazeNetworkSchema = z
  .object({ id: z.number(), name: z.string() })
  .nullish();

export const tvmazeEpisodeSchema = z.object({
  id: z.number(),
  season: z.number(),
  number: z.number().nullish(), // specials can have a null number
  name: z.string().nullish(),
  airdate: z.string().nullish(),
  runtime: z.number().nullish(),
  summary: z.string().nullish(), // HTML
  image: tvmazeImageSchema,
});
export type TvmazeEpisode = z.infer<typeof tvmazeEpisodeSchema>;

export const tvmazeSeasonSchema = z.object({
  id: z.number(),
  number: z.number(),
  name: z.string().nullish(),
  premiereDate: z.string().nullish(),
  episodeOrder: z.number().nullish(),
  summary: z.string().nullish(), // HTML
  image: tvmazeImageSchema,
});
export type TvmazeSeason = z.infer<typeof tvmazeSeasonSchema>;

export const tvmazeShowSchema = z.object({
  id: z.number(),
  name: z.string(),
  genres: z.array(z.string()).default([]),
  status: z.string().nullish(),
  premiered: z.string().nullish(),
  averageRuntime: z.number().nullish(),
  runtime: z.number().nullish(),
  rating: z.object({ average: z.number().nullish() }).nullish(),
  weight: z.number().nullish(),
  network: tvmazeNetworkSchema,
  webChannel: tvmazeNetworkSchema,
  image: tvmazeImageSchema,
  summary: z.string().nullish(), // HTML
  externals: z.object({ imdb: z.string().nullish() }).nullish(),
});
export type TvmazeShow = z.infer<typeof tvmazeShowSchema>;

// /shows/:id/images — poster (portrait), background (landscape), banner, etc.
export const tvmazeImageSetSchema = z.array(
  z.object({
    type: z.string().nullish(),
    resolutions: z
      .object({ original: z.object({ url: z.string() }).nullish() })
      .nullish(),
  }),
);
export type TvmazeImageSet = z.infer<typeof tvmazeImageSetSchema>;

export const tvmazeShowWithEmbedSchema = tvmazeShowSchema.extend({
  _embedded: z
    .object({
      episodes: z.array(tvmazeEpisodeSchema).default([]),
      seasons: z.array(tvmazeSeasonSchema).default([]),
      images: tvmazeImageSetSchema.default([]),
    })
    .nullish(),
});
export type TvmazeShowWithEmbed = z.infer<typeof tvmazeShowWithEmbedSchema>;

// /search/shows returns [{ score, show }]
export const tvmazeSearchSchema = z.array(z.object({ show: tvmazeShowSchema }));

// ─────────────────────────────── Cinemeta ──────────────────────────────

export const cinemetaMetaSchema = z.object({
  id: z.string(), // IMDb id, e.g. "tt0111161"
  imdb_id: z.string().nullish(),
  name: z.string(),
  poster: z.string().nullish(), // absolute URL
  background: z.string().nullish(), // absolute URL
  description: z.string().nullish(),
  genre: z.array(z.string()).nullish(),
  genres: z.array(z.string()).nullish(),
  year: z.string().nullish(),
  releaseInfo: z.string().nullish(),
  released: z.string().nullish(), // ISO datetime
  runtime: z.string().nullish(), // e.g. "142 min"
  imdbRating: z.string().nullish(),
});
export type CinemetaMeta = z.infer<typeof cinemetaMetaSchema>;

export const cinemetaMetaResponseSchema = z.object({
  meta: cinemetaMetaSchema.nullish(),
});

export const cinemetaCatalogSchema = z.object({
  metas: z.array(cinemetaMetaSchema).default([]),
});
