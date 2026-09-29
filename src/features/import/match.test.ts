import { describe, expect, it } from "vitest";
import { cleanTitle, pickMatch, squash, subtitleHead } from "./match";

// Names below are the real ones from a TV Time GDPR export that the original
// name-only matcher silently dropped (5 of 31 shows).

describe("cleanTitle", () => {
  it("strips TV Time's year and country disambiguators", () => {
    expect(cleanTitle("Euphoria (US)")).toBe("Euphoria");
    expect(cleanTitle("INVINCIBLE (2021)")).toBe("INVINCIBLE");
    expect(cleanTitle("Raised by Wolves (2020)")).toBe("Raised by Wolves");
    expect(cleanTitle("The Idol (2023)")).toBe("The Idol");
  });

  it("leaves ordinary titles alone", () => {
    expect(cleanTitle("Breaking Bad")).toBe("Breaking Bad");
    expect(cleanTitle("Demon Slayer: Kimetsu no Yaiba")).toBe(
      "Demon Slayer: Kimetsu no Yaiba",
    );
  });

  it("keeps a parenthetical that is part of the real title", () => {
    expect(cleanTitle("Bump (2021) Extra")).toBe("Bump (2021) Extra");
  });

  it("never returns empty", () => {
    expect(cleanTitle("(2020)")).toBe("(2020)");
  });
});

describe("subtitleHead", () => {
  it("returns the part before the colon", () => {
    expect(subtitleHead("Demon Slayer: Kimetsu no Yaiba")).toBe("Demon Slayer");
  });

  it("returns null when there is no subtitle", () => {
    expect(subtitleHead("Breaking Bad")).toBeNull();
  });
});

describe("pickMatch", () => {
  const target = (s: string) => squash(cleanTitle(s));

  it("prefers an exact title over a prefix match", () => {
    const hit = pickMatch(
      [{ name: "Star Trek" }, { name: "Star Trek: Picard" }],
      target("Star Trek: Picard"),
    );
    expect(hit?.name).toBe("Star Trek: Picard");
  });

  it("matches when the provider title extends the exported one", () => {
    const hit = pickMatch(
      [{ name: "Arcane: League of Legends" }],
      target("Arcane"),
    );
    expect(hit?.name).toBe("Arcane: League of Legends");
  });

  it("matches when the provider title is shorter than the exported one", () => {
    const hit = pickMatch(
      [{ name: "Demon Slayer" }],
      target("Demon Slayer: Kimetsu no Yaiba"),
    );
    expect(hit?.name).toBe("Demon Slayer");
  });

  it("ignores case and punctuation differences", () => {
    expect(pickMatch([{ name: "Invincible" }], target("INVINCIBLE (2021)"))?.name).toBe(
      "Invincible",
    );
    expect(pickMatch([{ name: "The Queen's Gambit" }], target("The Queens Gambit"))?.name).toBe(
      "The Queen's Gambit",
    );
  });

  it("rejects an unrelated show rather than guessing", () => {
    // Grafting a watch history onto the wrong show is worse than skipping.
    expect(pickMatch([{ name: "Breaking Bad" }], target("Better Call Saul"))).toBeNull();
    expect(pickMatch([], target("Anything"))).toBeNull();
  });
});
