import { NextRequest, NextResponse } from "next/server";
import { updateReviewStatus } from "@/services/reviews";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = requireAdmin(req);
    if (authResponse) {
      return authResponse;
    }

    const { id } = await params;
    await updateReviewStatus(id, "rejected");
    return NextResponse.json({ message: "Отзыв отклонён" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
