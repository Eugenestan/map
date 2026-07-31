import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createInterestingArticleSchema, zodIssuesToUserMessage } from "@/schemas";
import {
  createInterestingArticle,
  getInterestingArticlesForAdmin,
  InterestingArticleReferenceError,
} from "@/services/interesting-articles";

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) return authResponse;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const result = await getInterestingArticlesForAdmin({
      search: searchParams.get("q") || searchParams.get("search") || undefined,
      categoryId: searchParams.get("category") || searchParams.get("categoryId") || undefined,
      placeId: searchParams.get("place") || searchParams.get("placeId") || undefined,
      status: status === "draft" || status === "published" ? status : undefined,
      limit: numberParam(searchParams.get("limit"), 20),
      offset: numberParam(searchParams.get("offset"), 0),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке интересных статей" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) return authResponse;
    const parsed = createInterestingArticleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: zodIssuesToUserMessage(parsed.error.issues) }, { status: 400 });
    }
    return NextResponse.json({ data: await createInterestingArticle(parsed.data) }, { status: 201 });
  } catch (error) {
    if (error instanceof InterestingArticleReferenceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Ошибка при создании интересной статьи" }, { status: 500 });
  }
}
