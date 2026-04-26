import { NextResponse, type NextRequest } from "next/server";
import { getClientIp } from "@/lib/rate-limit";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

export function isTurnstileBypassed() {
  return process.env.TURNSTILE_BYPASS === "true" || (!isTurnstileEnabled() && process.env.NODE_ENV !== "production");
}

export async function verifyTurnstileToken(request: NextRequest, token?: string | null) {
  if (isTurnstileBypassed()) {
    return;
  }

  if (!process.env.TURNSTILE_SECRET_KEY) {
    throw new Error("Turnstile is not configured");
  }

  if (!token) {
    throw new Error("Подтвердите, что вы не бот");
  }

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token,
    remoteip: getClientIp(request),
  });

  const response = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error("Не удалось проверить anti-bot токен");
  }

  const result = await response.json() as { success: boolean; "error-codes"?: string[] };
  if (!result.success) {
    throw new Error("Проверка anti-bot не пройдена");
  }
}

export async function verifyTurnstileOrResponse(request: NextRequest, token?: string | null) {
  try {
    await verifyTurnstileToken(request, token);
    return null;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Проверка anti-bot не пройдена" },
      { status: 400 },
    );
  }
}
