import { NextRequest, NextResponse } from "next/server";
import { getVisitorSessionFromRequest, VISITOR_SESSION_COOKIE } from "@/lib/visitor-session";
import { recordAnalyticsEvent, type AnalyticsAction } from "@/services/analytics";

const ALLOWED_ACTIONS = new Set<AnalyticsAction>(["route", "phone", "website", "telegram", "share"]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      target?: string;
      path?: string;
      entityId?: string;
    };
    if (!body.target || !ALLOWED_ACTIONS.has(body.target as AnalyticsAction)) {
      return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
    }

    const session = getVisitorSessionFromRequest(request);
    await recordAnalyticsEvent({
      eventType: "action",
      target: body.target as AnalyticsAction,
      path: typeof body.path === "string" ? body.path : "/",
      entityId: typeof body.entityId === "string" ? body.entityId : null,
      visitorId: session.id,
      userAgent: request.headers.get("user-agent"),
    });

    const response = NextResponse.json({ ok: true });
    if (session.isNew) {
      response.cookies.set(VISITOR_SESSION_COOKIE, session.id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка трекинга действия" }, { status: 500 });
  }
}
