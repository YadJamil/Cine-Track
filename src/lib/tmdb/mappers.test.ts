import { describe, expect, it } from "vitest";
import { mapMovieDetails, mapShowDetails, stripHtml } from "./mappers";
import type { CinemetaMeta, TvmazeShowWithEmbed } from "./types";

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello   <b>world</b></p>")).toBe("Hello world");
  });
  it("returns null for empty/nullish", () => {
    expect(stripHtml(null)).toBeNull();
    expect(stripHtml("<p></p>")).toBeNull();
  });
});

describe("mapShowDetails", () => {
  const show: TvmazeShowWithEmbed = {
    id: 169,
    name: "Breaking Bad",
    genres: ["Drama", "Crime", "Thriller"],
    status: "Ended",
    premiered: "2008-01-20",
    averageRuntime: 60,
    rating: { average: 9.2 },
    weight: 99,
    network: { id: 20, name: "AMC" },
    webChannel: null,
    image: { medium: "m.jpg", original: "https://static.tvmaze.com/o.jpg" },
    summary: "<p>A chemistry teacher.</p>",
    externals: { imdb: "tt0903747" },
    _embedded: {
      seasons: [{ id: 1, number: 1, episodeOrder: 7 }],
      episodes: [
        { id: 1, season: 1, number: 1, name: "Pilot", airdate: "2008-01-20", runtime: 58 },
      ],
      images: [
        { type: "poster", resolutions: { original: { url: "https://static.tvmaze.com/p.jpg" } } },
        { type: "background", resolutions: { original: { url: "https://static.tvmaze.com/bg.jpg" } } },
      ],
    },
  };

  it("maps TVmaze show into a shows Insert row", () => {
    const row = mapShowDetails(show);
    expect(row.tmdb_id).toBe(169); // TVmaze id lives in tmdb_id
    expect(row.name).toBe("Breaking Bad");
    expect(row.overview).toBe("A chemistry teacher.");
    expect(row.poster_path).toBe("m.jpg"); // prefers the smaller `medium` image
    expect(row.backdrop_path).toBe("https://static.tvmaze.com/bg.jpg");
    expect(row.in_production).toBe(false);
    expect(row.vote_average).toBe(9.2);
    expect(row.genres).toEqual([{ name: "Drama" }, { name: "Crime" }, { name: "Thriller" }]);
    expect(row.number_of_seasons).toBe(1);
    expect(row.number_of_episodes).toBe(1);
  });
});

describe("mapMovieDetails", () => {
  const meta: CinemetaMeta = {
    id: "tt0111161",
    imdb_id: "tt0111161",
    name: "The Shawshank Redemption",
    poster: "https://images.metahub.space/poster.jpg",
    background: "https://images.metahub.space/bg.jpg",
    description: "Two imprisoned men bond.",
    genre: ["Drama"],
    year: "1994",
    released: "1994-10-14T00:00:00.000Z",
    runtime: "142 min",
    imdbRating: "9.3",
  };

  it("maps Cinemeta meta into a movies Insert row", () => {
    const row = mapMovieDetails(meta);
    expect(row.source_id).toBe("tt0111161");
    expect(row.title).toBe("The Shawshank Redemption");
    expect(row.poster_path).toBe("https://images.metahub.space/poster.jpg");
    expect(row.release_date).toBe("1994-10-14");
    expect(row.runtime).toBe(142);
    expect(row.vote_average).toBe(9.3);
    expect(row.genres).toEqual([{ name: "Drama" }]);
  });
});
