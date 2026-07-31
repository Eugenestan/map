import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createInterestingArticleCategorySchema, zodIssuesToUserMessage } from "@/schemas";
import {
  createInterestingArticleCategory,
  getInterestingArticleCategories,
} from "@/services/interesting-article-categories";

export async function GET(request: NextRequest) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) return authResponse;
    return NextResponse.json({ data: await getInterestingArticleCategories({ includeInactive: true }) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке категорий статей" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) return authResponse;
    const parsed = createInterestingArticleCategorySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: zodIssuesToUserMessage(parsed.error.issues) }, { status: 400 });
    }
    return NextResponse.json({ data: await createInterestingArticleCategory(parsed.data) }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при создании категории статей" }, { status: 500 });
  }
}
