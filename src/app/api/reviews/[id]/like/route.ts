import { NextRequest, NextResponse } from "next/server";
import { likeReview } from "@/services/reviews";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rateLimit = checkRateLimit({
      key: `like-review:${getClientIp(req)}:${id}`,
      limit: 5,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return createRateLimitResponse("Слишком много лайков за короткое время. Попробуйте позже.", rateLimit.retryAfterMs);
    }

    await likeReview(id);
    return NextResponse.json({ message: "Лайк добавлен" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
