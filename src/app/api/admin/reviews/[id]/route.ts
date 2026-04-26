import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminUpdateReviewSchema } from "@/schemas";
import { updateReview } from "@/services/reviews";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) {
      return authResponse;
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = adminUpdateReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
    }

    await updateReview(id, parsed.data);
    return NextResponse.json({ message: "Отзыв обновлён" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при обновлении отзыва" }, { status: 500 });
  }
}
