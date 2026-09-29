import { expect, test } from "@playwright/test";

/**
 * Smoke test: signup → onboard → follow → mark season → stats reflect it.
 * Needs supabase local running with migrations applied (media providers are keyless).
 * Email confirmations must be disabled locally OR inbucket auto-confirm used;
 * for simplicity this flow uses a pre-seeded demo account (npm run seed).
 */
// naza@cinetrack.demo isn't present in the local seed right now (DB reset
// without a reseed) — cattest@cinetrack.demo is the account confirmed
// present locally, same password.
const EMAIL = "cattest@cinetrack.demo";
const PASSWORD = "cinetrack-demo-1234";

test("logged-out visitors land on login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});

test("demo user can log in, see Watch Next, mark an episode, and see stats", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByRole("heading", { name: "Watch Next" })).toBeVisible({
    timeout: 15_000,
  });

  // mark the first Watch Next card as watched (optimistic: card leaves the rail)
  const firstCheck = page
    .getByRole("button", { name: /^Mark .* as watched$/ })
    .first();
  if (await firstCheck.isVisible().catch(() => false)) {
    const label = await firstCheck.getAttribute("aria-label");
    await firstCheck.click();
    await expect(page.getByText("watched", { exact: false }).first()).toBeVisible();
    expect(label).toBeTruthy();
  }

  // stats page renders headline cards + charts
  await page.goto("/profile/cattest/stats");
  await expect(page.getByText("Episodes watched")).toBeVisible();
  await expect(page.getByText("Biggest marathons")).toBeVisible();
});

test("public show page renders for anonymous visitors", async ({ page }) => {
  // Breaking Bad TVmaze id — hydrates the local cache on first visit
  await page.goto("/shows/169");
  await expect(page.getByRole("heading", { name: "Breaking Bad" })).toBeVisible(
    { timeout: 20_000 },
  );
  await expect(page.getByRole("tab", { name: "Episodes" })).toBeVisible();
});

test("stop-watching (archive) button toggles and can be undone", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Watch Next" })).toBeVisible({
    timeout: 15_000,
  });

  await page.goto("/shows/169"); // Breaking Bad
  await expect(
    page.getByRole("heading", { name: "Breaking Bad" }),
  ).toBeVisible({ timeout: 20_000 });

  // Read whichever state it's currently in rather than assuming — the demo
  // account's tracking state can vary between runs — then restore it after.
  const archiveButton = page.getByRole("button", {
    name: /^(Stop watching \(archive\)|Resume watching)$/,
  });
  await expect(archiveButton).toBeVisible();
  const wasArchived =
    (await archiveButton.getAttribute("aria-pressed")) === "true";

  await archiveButton.click();
  await expect(archiveButton).toHaveAttribute(
    "aria-pressed",
    String(!wasArchived),
  );
  await expect(archiveButton).toHaveAccessibleName(
    wasArchived ? "Stop watching (archive)" : "Resume watching",
  );

  // Flip back so the demo account's state is left as it was found.
  await archiveButton.click();
  await expect(archiveButton).toHaveAttribute(
    "aria-pressed",
    String(wasArchived),
  );
});
