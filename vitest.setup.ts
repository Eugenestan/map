import { afterEach, vi } from "vitest";

process.env.TURNSTILE_BYPASS = "true";

afterEach(() => {
  global.__nhatrangRateLimitStore__?.clear();
  vi.restoreAllMocks();
});
