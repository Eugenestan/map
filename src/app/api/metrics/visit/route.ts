import { NextRequest, NextResponse } from "next/server";
import { getVisitorSessionFromRequest, VISITOR_SESSION_COOKIE } from "@/lib/visitor-session";
import { registerVisit } from "@/services/visits";

function shouldTrackPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("/admin");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { path?: string };
    const path = typeof body.path === "string" ? body.path : "/";

    if (!shouldTrackPath(path)) {
      return NextResponse.json({ ok: true });
    }

    const session = getVisitorSessionFromRequest(request);
    await registerVisit(path, session.id, session.isNew);

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
    return NextResponse.json({ error: "Ошибка трекинга визита" }, { status: 500 });
  }
}
