import { NextResponse } from "next/server";
import { getInterestingArticleCategories } from "@/services/interesting-article-categories";

export async function GET() {
  try {
    return NextResponse.json({ data: await getInterestingArticleCategories() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке категорий статей" }, { status: 500 });
  }
}
