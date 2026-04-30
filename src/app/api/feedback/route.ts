import { NextRequest, NextResponse } from "next/server";
import { feedbackSchema } from "@/schemas";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstileOrResponse } from "@/lib/turnstile";
import { sendFeedbackEmail } from "@/lib/send-feedback-email";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const honeypot = typeof body.website_url === "string" ? body.website_url.trim() : "";
    if (honeypot.length > 0) {
      return NextResponse.json({ ok: true });
    }

    const rateLimit = checkRateLimit({
      key: `feedback:${getClientIp(req)}`,
      limit: 3,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return createRateLimitResponse("Слишком много сообщений. Попробуйте позже.", rateLimit.retryAfterMs);
    }

    const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : null;
    const payload = {
      name: body.name,
      email: body.email,
      feedbackType: body.feedbackType,
      message: body.message,
    };

    const turnstileResponse = await verifyTurnstileOrResponse(req, turnstileToken);
    if (turnstileResponse) {
      return turnstileResponse;
    }

    const parsed = feedbackSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await sendFeedbackEmail(parsed.data);
    return NextResponse.json({ ok: true, message: "Сообщение отправлено" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось отправить сообщение. Попробуйте позже." }, { status: 500 });
  }
}
