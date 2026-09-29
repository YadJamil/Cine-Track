import { describe, expect, it } from "vitest";
import {
  addictionBonus,
  buildGenreAffinity,
  popularityRanks,
  ratingBonus,
  recencyDecay,
  scoreCandidate,
  topGenres,
} from "./scoring";

const now = new Date("2026-08-15T12:00:00Z");
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 86_400_000).toISOString();

describe("recencyDecay", () => {
  it("halves at the half-life", () => {
    expect(recencyDecay(45, 45)).toBeCloseTo(0.5);
  });
  it("is 1 at zero days", () => {
    expect(recencyDecay(0, 45)).toBeCloseTo(1);
  });
});

describe("ratingBonus", () => {
  it("is 0 when unrated", () => {
    expect(ratingBonus(null)).toBe(0);
    expect(ratingBonus(undefined)).toBe(0);
  });
  it("is positive above 5.5 and clamps at 1", () => {
    expect(ratingBonus(10)).toBeCloseTo(1);
    expect(ratingBonus(7)).toBeGreaterThan(0);
  });
  it("is negative below 5.5 and clamps at -1", () => {
    expect(ratingBonus(1)).toBeCloseTo(-1);
    expect(ratingBonus(3)).toBeLessThan(0);
  });
});

describe("addictionBonus", () => {
  it("is 0 when null", () => {
    expect(addictionBonus(null)).toBe(0);
  });
  it("scales 0..1 and clamps", () => {
    expect(addictionBonus(50)).toBeCloseTo(0.5);
    expect(addictionBonus(500)).toBe(1);
    expect(addictionBonus(-10)).toBe(0);
  });
});

describe("buildGenreAffinity", () => {
  it("adds a multi-genre title's full signal to every one of its genres", () => {
    const affinity = buildGenreAffinity(
      [{ genres: ["Drama", "Crime"], lastWatchedAt: daysAgo(0) }],
      now,
    );
    expect(affinity.get("Drama")).toBeCloseTo(1);
    expect(affinity.get("Crime")).toBeCloseTo(1);
  });
  it("normalizes so the strongest genre is exactly 1", () => {
    const affinity = buildGenreAffinity(
      [
        { genres: ["Drama"], lastWatchedAt: daysAgo(0), rating: 10 },
        { genres: ["Comedy"], lastWatchedAt: daysAgo(200) },
      ],
      now,
    );
    const max = Math.max(...affinity.values());
    expect(max).toBeCloseTo(1);
    expect(affinity.get("Drama")).toBeCloseTo(1);
    expect(affinity.get("Comedy")).toBeLessThan(1);
  });
  it("returns an empty map with no signal", () => {
    expect(buildGenreAffinity([], now).size).toBe(0);
  });
});

describe("topGenres", () => {
  const affinity = new Map([
    ["Drama", 1],
    ["Comedy", 0.5],
    ["Horror", 0.1],
  ]);
  it("respects the threshold", () => {
    expect(topGenres(affinity, 5, 0.3)).toEqual(["Drama", "Comedy"]);
  });
  it("respects k", () => {
    expect(topGenres(affinity, 1, 0)).toEqual(["Drama"]);
  });
});

describe("popularityRanks", () => {
  it("ranks the top item 1 and the bottom item 0", () => {
    const items = ["a", "b", "c"];
    const pop = { a: 100, b: 50, c: 10 };
    const ranks = popularityRanks(items, (i) => pop[i as keyof typeof pop]);
    expect(ranks.get("a")).toBeCloseTo(1);
    expect(ranks.get("c")).toBeCloseTo(0);
  });
  it("gives null-popularity items 0 regardless of position", () => {
    const items = ["a", "b"];
    const ranks = popularityRanks(items, (i) => (i === "a" ? null : 50));
    expect(ranks.get("a")).toBe(0);
    expect(ranks.get("b")).toBe(1);
  });
});

describe("scoreCandidate", () => {
  const affinity = new Map([["Sci-Fi", 1]]);
  it("scores near 1 for a top-genre, top-popularity, top-trend, top-rated candidate", () => {
    const score = scoreCandidate(
      { genres: ["Sci-Fi"], popularityRank: 1, voteAverage: 10, trendScore: 100 },
      affinity,
      100,
    );
    expect(score).toBeCloseTo(1);
  });
  it("scores near 0 for an unmatched, unpopular, unrated candidate", () => {
    const score = scoreCandidate(
      { genres: ["Documentary"], popularityRank: 0, voteAverage: null, trendScore: 0 },
      affinity,
      100,
    );
    expect(score).toBeCloseTo(0);
  });
  it("falls back to 0 trend term when nothing in the pool is trending", () => {
    const score = scoreCandidate(
      { genres: ["Sci-Fi"], popularityRank: 0, voteAverage: null, trendScore: 5 },
      affinity,
      0,
    );
    expect(score).toBeCloseTo(0.45);
  });
});
