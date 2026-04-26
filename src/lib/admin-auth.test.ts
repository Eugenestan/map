import { randomBytes, scryptSync } from "crypto";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSession,
  isAdminAuthConfigured,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { setAdminSessionCookie, clearAdminSessionCookie } from "@/lib/admin-auth";

function makePasswordHash(password: string) {
  const salt = randomBytes(8).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

describe("admin-auth", () => {
  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD_HASH = makePasswordHash("strong-password");
    process.env.ADMIN_SESSION_SECRET = "test-session-secret";
  });

  it("detects when admin auth is configured", () => {
    expect(isAdminAuthConfigured()).toBe(true);
  });

  it("verifies valid credentials", () => {
    expect(verifyAdminCredentials("admin@example.com", "strong-password")).toBe(true);
    expect(verifyAdminCredentials("admin@example.com", "wrong-password")).toBe(false);
  });

  it("creates and validates admin session token", () => {
    const token = createAdminSessionToken("admin@example.com");
    const session = getAdminSession(token);

    expect(session?.email).toBe("admin@example.com");
  });

  it("sets and clears session cookie", () => {
    const response = NextResponse.json({ ok: true });
    setAdminSessionCookie(response, "admin@example.com");
    expect(response.cookies.get(ADMIN_SESSION_COOKIE)?.value).toBeTruthy();

    clearAdminSessionCookie(response);
    expect(response.cookies.get(ADMIN_SESSION_COOKIE)?.value).toBe("");
  });
});
