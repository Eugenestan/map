import { randomBytes, scryptSync } from "crypto";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/login/route";

function makePasswordHash(password: string) {
  const salt = randomBytes(8).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD_HASH = makePasswordHash("secret-pass");
    process.env.ADMIN_SESSION_SECRET = "test-secret";
  });

  it("returns 200 and sets a session cookie for valid credentials", async () => {
    const request = new NextRequest("http://localhost/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@example.com", password: "secret-pass" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("nhatrang_admin_session");
  });

  it("returns 401 for invalid credentials", async () => {
    const request = new NextRequest("http://localhost/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@example.com", password: "wrong-pass" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
