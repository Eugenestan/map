import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createArticleSchema, zodIssuesToUserMessage } from "@/schemas";
import { createArticle, getArticlesForAdmin } from "@/services/articles";

export async function GET(request: NextRequest) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) {
      return authResponse;
    }

    const articles = await getArticlesForAdmin();
    return NextResponse.json({ data: articles });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке мест" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) {
      return authResponse;
    }

    const body = await request.json();
    const parsed = createArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: zodIssuesToUserMessage(parsed.error.issues) }, { status: 400 });
    }

    const result = await createArticle(parsed.data);
    return NextResponse.json({ data: result, message: "Место создано" }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при создании места" }, { status: 500 });
  }
}
