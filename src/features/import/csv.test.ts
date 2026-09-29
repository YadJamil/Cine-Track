import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildImportShows, parseCsv, toRecords } from "./csv";

describe("parseCsv", () => {
  it("handles quoted fields with commas and escaped quotes", () => {
    const rows = parseCsv('a,b\n"x,y","he said ""hi"""\n');
    expect(rows).toEqual([
      ["a", "b"],
      ["x,y", 'he said "hi"'],
    ]);
  });
});

describe("toRecords", () => {
  it("keys cells by header", () => {
    const recs = toRecords("name,age\nNaza,3\n");
    expect(recs).toEqual([{ name: "Naza", age: "3" }]);
  });
});

// Normalizes a real TV Time export when one is present locally. The gdpr-data/
// folder holds personal data and is not part of the repo — skip without it.
const GDPR_DIR = join(process.cwd(), "gdpr-data");
const HAS_EXPORT = existsSync(join(GDPR_DIR, "user_tv_show_data.csv"));
describe.skipIf(!HAS_EXPORT)("buildImportShows (real export)", () => {
  const read = (f: string) => readFileSync(join(GDPR_DIR, f), "utf8");
  const shows = HAS_EXPORT
    ? buildImportShows({
        userTvShowData: read("user_tv_show_data.csv"),
        specialStatus: read("user_show_special_status.csv"),
        tracking: read("tracking-prod-records-v2.csv"),
      })
    : [];

  it("produces a followed show list with watch history", () => {
    expect(shows.length).toBeGreaterThan(10);
    expect(shows.every((s) => s.isFollowed)).toBe(true);
    const totalWatches = shows.reduce((n, s) => n + s.watches.length, 0);
    expect(totalWatches).toBeGreaterThan(500); // ~1194 watch-episode rows
  });

  it("carries special statuses and valid watch rows", () => {
    const gifted = shows.find((s) => s.name === "The Gifted");
    expect(gifted?.isForLater).toBe(true);
    for (const s of shows) {
      for (const w of s.watches) {
        expect(w.season).toBeGreaterThanOrEqual(1);
        expect(Number.isInteger(w.episode)).toBe(true);
        expect(w.watchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    }
  });
});
