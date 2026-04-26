import { checkRateLimit } from "@/lib/rate-limit";

describe("rate-limit", () => {
  it("allows requests under the limit", () => {
    const first = checkRateLimit({ key: "test-key", limit: 2, windowMs: 1000 });
    const second = checkRateLimit({ key: "test-key", limit: 2, windowMs: 1000 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  it("blocks requests over the limit", () => {
    checkRateLimit({ key: "blocked-key", limit: 1, windowMs: 1000 });
    const result = checkRateLimit({ key: "blocked-key", limit: 1, windowMs: 1000 });

    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });
});
