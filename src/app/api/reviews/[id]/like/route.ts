import { NextRequest, NextResponse } from "next/server";
import { likeReviewOnce } from "@/services/reviews";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { getVisitorSessionFromRequest, VISITOR_SESSION_COOKIE } from "@/lib/visitor-session";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

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

    const { id: sessionId, isNew } = getVisitorSessionFromRequest(req);
    const outcome = await likeReviewOnce(id, sessionId);

    if (outcome === "duplicate") {
      const res = NextResponse.json(
        { error: "Вы уже отметили этот отзыв", duplicate: true },
        { status: 409 },
      );
      if (isNew) {
        res.cookies.set(VISITOR_SESSION_COOKIE, sessionId, {
          path: "/",
          maxAge: COOKIE_MAX_AGE,
          sameSite: "lax",
          httpOnly: true,
        });
      }
      return res;
    }

    const res = NextResponse.json({ message: "Лайк добавлен" });
    if (isNew) {
      res.cookies.set(VISITOR_SESSION_COOKIE, sessionId, {
        path: "/",
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
        httpOnly: true,
      });
    }
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
