import { NextRequest, NextResponse } from "next/server";
import { getPendingReviews } from "@/services/reviews";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) {
      return authResponse;
    }

    const reviews = await getPendingReviews();
    return NextResponse.json({ data: reviews });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при загрузке отзывов" }, { status: 500 });
  }
}
