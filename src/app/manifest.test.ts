import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("PWA manifest", () => {
  it("launches the installed app from the canonical root URL", () => {
    expect(manifest()).toMatchObject({
      id: "/",
      start_url: "/",
      scope: "/",
    });
  });
});
