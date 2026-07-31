import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { updateInterestingArticleCategorySchema, zodIssuesToUserMessage } from "@/schemas";
import {
  deleteInterestingArticleCategory,
  getInterestingArticleCategoryById,
  updateInterestingArticleCategory,
} from "@/services/interesting-article-categories";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) return authResponse;
    const category = await getInterestingArticleCategoryById((await params).id);
    if (!category) return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
    return NextResponse.json({ data: category });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке категории статей" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) return authResponse;
    const parsed = updateInterestingArticleCategorySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: zodIssuesToUserMessage(parsed.error.issues) }, { status: 400 });
    }
    const category = await updateInterestingArticleCategory((await params).id, parsed.data);
    if (!category) return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
    return NextResponse.json({ data: category });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при обновлении категории статей" }, { status: 500 });
  }
}

export const PUT = PATCH;

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) return authResponse;
    const result = await deleteInterestingArticleCategory((await params).id);
    if (result === "not_found") return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
    if (result === "in_use") {
      return NextResponse.json({ error: "Категория используется статьями" }, { status: 409 });
    }
    return NextResponse.json({ message: "Категория удалена" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при удалении категории статей" }, { status: 500 });
  }
}
