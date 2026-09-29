import { describe, expect, it } from "vitest";
import { currentStreak } from "./streak";

const now = new Date("2026-07-15T12:00:00Z");
const day = (offset: number) =>
  new Date(now.getTime() - offset * 86_400_000).toISOString().slice(0, 10);

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(currentStreak([day(0), day(1), day(2)], now)).toBe(3);
  });
  it("still counts when today has no connection yet", () => {
    expect(currentStreak([day(1), day(2)], now)).toBe(2);
  });
  it("breaks on a gap", () => {
    expect(currentStreak([day(0), day(2), day(3)], now)).toBe(1);
    expect(currentStreak([day(3), day(4)], now)).toBe(0);
  });
  it("handles empty input", () => {
    expect(currentStreak([], now)).toBe(0);
  });
});
