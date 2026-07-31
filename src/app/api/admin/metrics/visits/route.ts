import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAnalyticsSummary } from "@/services/analytics";

export async function GET(request: NextRequest) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) {
      return authResponse;
    }

    const requestedDays = Number(request.nextUrl.searchParams.get("days") ?? 7);
    const summary = await getAnalyticsSummary(requestedDays);
    return NextResponse.json({ data: summary });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке статистики посещений" }, { status: 500 });
  }
}
