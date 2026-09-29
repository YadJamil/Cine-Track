import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * PWA offline gate shell (public/shell.html + public/sw.js).
 *
 * The installed app launches from its canonical root URL. The shell is served
 * cache-first when requested directly and as the offline fallback for failed
 * navigations; it rests at the offline panel after a boop (never a dead end,
 * never a lockout).
 *
 * The service worker only registers in production builds, so this spec needs a
 * prod server and opts in via E2E_PWA:
 *
 *   npm run build
 *   npx next start -p 3100
 *   E2E_PWA=1 E2E_NO_SERVER=1 E2E_BASE_URL=http://localhost:3100 \
 *     npx playwright test e2e/offline-boop.spec.ts
 */
test.skip(
  !process.env.E2E_PWA,
  "needs a production server (the SW is disabled in dev) — set E2E_PWA=1",
);

const GATE = "Boop the cat's nose to enter CineTrack";
const NOSE = "Boop the cat's nose to enter";

/** Visit once online so the SW installs, precaches, and activates. */
async function warmServiceWorker(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/login");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  return page;
}

test("cold offline start renders the gate; booping leads to the offline panel", async ({
  context,
}) => {
  const warm = await warmServiceWorker(context);
  await warm.close(); // "app closed"
  await context.setOffline(true);

  // Fresh tab = fresh sessionStorage = the installed-icon cold start.
  const page = await context.newPage();
  await page.goto("/");

  // Online, "/" redirects a logged-out visitor to /login (which has no gate);
  // staying on "/" with the gate visible proves the SW served the shell.
  await expect(page).toHaveURL("/");
  const gate = page.getByRole("dialog", { name: GATE });
  await expect(gate).toBeVisible();
  await expect(page.getByText("Boop the nose to enter")).toBeVisible();

  // The nose is auto-focused, so keyboard users boop with a bare Enter.
  const nose = page.getByRole("button", { name: NOSE });
  await expect(nose).toBeFocused();
  await page.keyboard.press("Enter");

  // Celebration, then the boop retries "/" — still offline, so the SW serves
  // the shell again, which remembers the boop and rests at the panel.
  await expect(page.getByText("purrrrrr")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /offline/i }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(gate).toBeHidden();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();

  // Same tab-session, still offline: the boop is remembered, no second gate.
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: GATE })).toBeHidden();
  await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
});

test("Escape skips the ceremony offline", async ({ context }) => {
  const warm = await warmServiceWorker(context);
  await warm.close();
  await context.setOffline(true);

  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: GATE })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: GATE })).toBeHidden();
  await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
});

test("reduced motion still gets a boopable gate and a still celebration", async ({
  context,
}) => {
  const warm = await warmServiceWorker(context);
  await warm.close();
  await context.setOffline(true);

  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: GATE })).toBeVisible();

  await page.getByRole("button", { name: NOSE }).click();
  // Hearts appear statically (opacity 1, no animation) in reduced motion.
  await expect(page.locator(".heart").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /offline/i }),
  ).toBeVisible({ timeout: 5_000 });
});

test("online shell visit paints the gate from local cache, then hands off into the app", async ({
  context,
}) => {
  const warm = await warmServiceWorker(context);
  await warm.close();
  // Network stays ON — the point is that the gate is local anyway.

  const page = await context.newPage();
  await page.goto("/shell.html");
  await expect(page.getByRole("dialog", { name: GATE })).toBeVisible();

  // Zero bytes over the wire: the SW answered from the precache.
  const transferSize = await page.evaluate(
    () =>
      (
        performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming
      ).transferSize,
  );
  expect(transferSize).toBe(0);

  // Boop → hand-off to "/" → logged-out redirect → login page, and the
  // session flag means no second gate on the server-rendered page.
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  await expect(page.getByRole("dialog", { name: GATE })).toBeHidden();
});

test("offline PWA launch still gates, then rests at the offline panel", async ({
  context,
}) => {
  const warm = await warmServiceWorker(context);
  await warm.close();
  await context.setOffline(true);

  const page = await context.newPage();
  await page.goto("/shell.html");
  await expect(page.getByRole("dialog", { name: GATE })).toBeVisible();

  // Boop → hand-off to "/" → offline → SW falls back to the shell, which
  // remembers the boop and shows the panel instead of a second cat.
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
  await expect(page.getByRole("dialog", { name: GATE })).toBeHidden();
});

test("the gate never waits on the server: zero requests before the boop, app document only after", async ({
  context,
}) => {
  const warm = await warmServiceWorker(context);
  await warm.close();

  const page = await context.newPage();
  await page.goto("/shell.html");
  await expect(page.getByRole("dialog", { name: GATE })).toBeVisible();

  // The shell fetched nothing: zero bytes for the document (SW precache) and
  // zero subresources — everything the gate needs is inline.
  const shellNetwork = await page.evaluate(() => ({
    resources: performance.getEntriesByType("resource").length,
    transferSize: (
      performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming
    ).transferSize,
  }));
  expect(shellNetwork).toEqual({ resources: 0, transferSize: 0 });

  const boopedAt = await page.evaluate(() => Date.now());
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });

  // The app document (whose server render is what fetches the personal data)
  // started only after the boop celebration — never before or in parallel.
  const appStartedAt = await page.evaluate(() => performance.timeOrigin);
  expect(appStartedAt).toBeGreaterThan(boopedAt + 900);
});

test("blocked sessionStorage never locks the gate", async ({ context }) => {
  const warm = await warmServiceWorker(context);
  await warm.close();

  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new Error("storage disabled");
      },
    });
  });
  await context.setOffline(true);

  await page.goto("/");
  await expect(page.getByRole("dialog", { name: GATE })).toBeVisible();
  // force: the idle cat sways on an infinite loop, so the nose never passes
  // Playwright's stability check; the panel assertion proves the boop landed.
  await page.getByRole("button", { name: NOSE }).click({ force: true });
  await expect(
    page.getByRole("heading", { name: /offline/i }),
  ).toBeVisible({ timeout: 5_000 });
});
