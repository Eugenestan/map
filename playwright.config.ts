import { defineConfig } from "@playwright/test";

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/nhatrang_map";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run db:migrate && npm run db:seed:demo && npx next dev -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
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
