import { createHmac, scryptSync, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export const ADMIN_SESSION_COOKIE = "nhatrang_admin_session";

interface AdminSessionPayload {
  email: string;
  exp: number;
}

function getEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function getAdminEmail(): string {
  return getEnv("ADMIN_EMAIL").toLowerCase();
}

function getAdminPasswordHash(): string {
  return getEnv("ADMIN_PASSWORD_HASH");
}

function getAdminSessionSecret(): string {
  return getEnv("ADMIN_SESSION_SECRET");
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(getAdminEmail() && getAdminPasswordHash() && getAdminSessionSecret());
}

export function getAdminAuthConfigError(): string {
  if (isAdminAuthConfigured()) {
    return "";
  }

  return "Авторизация администратора не настроена. Укажите ADMIN_EMAIL, ADMIN_PASSWORD_HASH и ADMIN_SESSION_SECRET.";
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  if (!isAdminAuthConfigured()) {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== getAdminEmail()) {
    return false;
  }

  const [salt, storedHash] = getAdminPasswordHash().split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const computedHash = scryptSync(password, salt, 64).toString("hex");
  const storedBuffer = Buffer.from(storedHash, "hex");
  const computedBuffer = Buffer.from(computedHash, "hex");

  if (storedBuffer.length === 0 || storedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, computedBuffer);
}

function sign(value: string): string {
  return createHmac("sha256", getAdminSessionSecret()).update(value).digest("base64url");
}

export function createAdminSessionToken(email: string): string {
  const payload: AdminSessionPayload = {
    email: email.trim().toLowerCase(),
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function getAdminSession(token?: string | null): AdminSessionPayload | null {
  if (!token || !isAdminAuthConfigured()) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AdminSessionPayload;
    if (payload.email !== getAdminEmail() || payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function setAdminSessionCookie(response: NextResponse, email: string) {
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function requireAdmin(request: NextRequest): NextResponse | null {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json({ error: getAdminAuthConfigError() }, { status: 500 });
  }

  const session = getAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация администратора" }, { status: 401 });
  }

  return null;
}
