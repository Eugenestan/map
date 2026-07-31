import { NextRequest, NextResponse } from "next/server";
import { getPublishedInterestingArticlesByPlace } from "@/services/interesting-articles";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 20;
    const offset = Number(searchParams.get("offset")) || 0;
    const result = await getPublishedInterestingArticlesByPlace(id, { limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке упоминаний места" }, { status: 500 });
  }
}
