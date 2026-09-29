import { describe, expect, it } from "vitest";
import { formatDuration, formatEpisodeCode } from "./format";

describe("formatDuration", () => {
  it("formats the export's total runtime (2,429,700 s ≈ 675 h)", () => {
    expect(formatDuration(2_429_700)).toBe("28d 2h 55m");
  });
  it("omits zero leading units", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(59)).toBe("0m");
    expect(formatDuration(3_600)).toBe("1h 0m");
    expect(formatDuration(86_400)).toBe("1d 0m");
  });
});

describe("formatEpisodeCode", () => {
  it("renders SxEy", () => {
    expect(formatEpisodeCode(2, 7)).toBe("S2E7");
  });
});
