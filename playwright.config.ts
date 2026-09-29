import { defineConfig } from "@playwright/test";

// Requires a running Supabase local stack + TMDB key (see README).
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
  },
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: process.env.E2E_BASE_URL ?? "http://localhost:3000",
        reuseExistingServer: true,
      },
});
