import { NextRequest, NextResponse } from "next/server";
import { getPublishedInterestingArticles } from "@/services/interesting-articles";

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await getPublishedInterestingArticles({
      search: searchParams.get("q") || searchParams.get("search") || undefined,
      categoryId: searchParams.get("category") || searchParams.get("categoryId") || undefined,
      placeId: searchParams.get("place") || searchParams.get("placeId") || undefined,
      limit: numberParam(searchParams.get("limit"), 20),
      offset: numberParam(searchParams.get("offset"), 0),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке интересных статей" }, { status: 500 });
  }
}
