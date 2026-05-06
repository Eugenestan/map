import { NextRequest, NextResponse } from "next/server";
import { getArticles } from "@/services/articles";

function getTagsParam(value: string | null): string[] {
  return value?.split(",").map((tag) => tag.trim()).filter(Boolean) || [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articles = await getArticles({
      search: searchParams.get("q") || searchParams.get("search") || undefined,
      placeId: searchParams.get("place") || searchParams.get("placeId") || undefined,
      tagIds: getTagsParam(searchParams.get("tags")),
      limit: 100,
    });

    return NextResponse.json({ data: articles });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке мест" }, { status: 500 });
  }
}
