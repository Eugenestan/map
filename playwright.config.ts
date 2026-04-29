import { defineConfig } from "@playwright/test";

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/nhatrang_map";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run db:migrate && npm run db:seed:demo && node --max-old-space-size=2048 ./node_modules/next/dist/bin/next dev --webpack -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      TURNSTILE_BYPASS: "true",
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD_HASH: "playwrightsalt:88571a19a7565572df6a3f91e0ea468bfbc1c1ecaec5f4ce095143d8ef11759411706b444640795e8956d5367585adbcf9ea662fde07d0954ba9e3d4a9ccb98e",
      ADMIN_SESSION_SECRET: "playwright-test-session-secret",
    },
  },
});
