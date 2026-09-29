import { describe, expect, it } from "vitest";
import {
  ageFromBirthday,
  completeOnboardingSchema,
  identitySchema,
} from "./schemas";

describe("ageFromBirthday", () => {
  it("computes age before and after this year's birthday", () => {
    const now = new Date();
    const y = now.getFullYear();
    expect(ageFromBirthday(`${y - 20}-01-01`)).toBeGreaterThanOrEqual(20);
    expect(ageFromBirthday(`${y - 10}-12-31`)).toBeLessThanOrEqual(10);
  });
});

describe("identitySchema", () => {
  it("accepts valid usernames", () => {
    expect(identitySchema.safeParse({ username: "naza_01", displayName: "Naza" }).success).toBe(true);
  });
  it("rejects uppercase, short and symbol-laden usernames", () => {
    for (const username of ["Naza", "ab", "a".repeat(21), "has space", "hé"]) {
      expect(
        identitySchema.safeParse({ username, displayName: "x" }).success,
      ).toBe(false);
    }
  });
});

describe("completeOnboardingSchema", () => {
  it("requires at least 3 shows", () => {
    expect(completeOnboardingSchema.safeParse({ tmdbIds: [1, 2] }).success).toBe(false);
    expect(completeOnboardingSchema.safeParse({ tmdbIds: [1, 2, 3] }).success).toBe(true);
  });
});
