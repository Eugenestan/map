import { NextRequest, NextResponse } from "next/server";
import {
  getAdminAuthConfigError,
  isAdminAuthConfigured,
  setAdminSessionCookie,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit({
      key: `admin-login:${getClientIp(request)}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return createRateLimitResponse("Слишком много попыток входа. Попробуйте позже.", rateLimit.retryAfterMs);
    }

    if (!isAdminAuthConfigured()) {
      return NextResponse.json({ error: getAdminAuthConfigError() }, { status: 500 });
    }

    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Укажите email и пароль" }, { status: 400 });
    }

    if (!verifyAdminCredentials(email, password)) {
      return NextResponse.json({ error: "Неверная почта или пароль" }, { status: 401 });
    }

    const response = NextResponse.json({ message: "Вход выполнен" });
    setAdminSessionCookie(response, email);
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при входе" }, { status: 500 });
  }
}
