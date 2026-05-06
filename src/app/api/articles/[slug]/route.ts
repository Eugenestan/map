import { NextRequest, NextResponse } from "next/server";
import { getArticleBySlug } from "@/services/articles";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);
    if (!article) {
      return NextResponse.json({ error: "Место не найдено" }, { status: 404 });
    }
    return NextResponse.json({ data: article });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке места" }, { status: 500 });
  }
}
