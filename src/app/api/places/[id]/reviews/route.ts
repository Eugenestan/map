import { NextRequest, NextResponse } from "next/server";
import { getReviewsByPlace, createReview } from "@/services/reviews";
import { addReviewSchema } from "@/schemas";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstileOrResponse } from "@/lib/turnstile";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const reviews = await getReviewsByPlace(id);
    return NextResponse.json({ data: reviews });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при загрузке отзывов" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimit = checkRateLimit({
      key: `create-review:${getClientIp(req)}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return createRateLimitResponse("Слишком много отзывов за короткое время. Попробуйте позже.", rateLimit.retryAfterMs);
    }

    const { id } = await params;
    const body = await req.json();
    const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken : null;
    const payload = { ...body };
    delete payload.turnstileToken;

    const turnstileResponse = await verifyTurnstileOrResponse(req, turnstileToken);
    if (turnstileResponse) {
      return turnstileResponse;
    }

    const parsed = addReviewSchema.safeParse({ ...payload, place_id: id });
    if (!parsed.success) {
      return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
    }
    const result = await createReview(parsed.data);
    return NextResponse.json({ data: result, message: "Отзыв отправлен на модерацию" }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при создании отзыва" }, { status: 500 });
  }
}
