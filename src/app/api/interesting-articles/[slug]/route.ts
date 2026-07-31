import { NextRequest, NextResponse } from "next/server";
import { getPublishedInterestingArticleBySlug } from "@/services/interesting-articles";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const article = await getPublishedInterestingArticleBySlug(slug);
    if (!article) {
      return NextResponse.json({ error: "Статья не найдена" }, { status: 404 });
    }
    return NextResponse.json({ data: article });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке интересной статьи" }, { status: 500 });
  }
}
