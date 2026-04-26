import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getReviewsByPlace } from "@/services/reviews";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) {
      return authResponse;
    }

    const { id } = await params;
    const reviews = await getReviewsByPlace(id, true);
    return NextResponse.json({ data: reviews });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке отзывов места" }, { status: 500 });
  }
}
