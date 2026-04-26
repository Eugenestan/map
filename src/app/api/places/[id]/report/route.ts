import { NextRequest, NextResponse } from "next/server";
import { createReport } from "@/services/reports";
import { reportSchema } from "@/schemas";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstileOrResponse } from "@/lib/turnstile";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimit = checkRateLimit({
      key: `report-place:${getClientIp(req)}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return createRateLimitResponse("Слишком много жалоб. Попробуйте позже.", rateLimit.retryAfterMs);
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

    const parsed = reportSchema.safeParse({ ...payload, entity_type: "place", entity_id: id });
    if (!parsed.success) {
      return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
    }
    const result = await createReport(parsed.data);
    return NextResponse.json({ data: result, message: "Жалоба отправлена" }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при отправке жалобы" }, { status: 500 });
  }
}
