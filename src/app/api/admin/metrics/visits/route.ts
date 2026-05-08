import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getVisitSummary } from "@/services/visits";

export async function GET(request: NextRequest) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) {
      return authResponse;
    }

    const summary = await getVisitSummary(7);
    return NextResponse.json({ data: summary });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке статистики посещений" }, { status: 500 });
  }
}
