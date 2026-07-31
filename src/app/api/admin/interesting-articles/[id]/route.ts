import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { updateInterestingArticleSchema, zodIssuesToUserMessage } from "@/schemas";
import {
  deleteInterestingArticle,
  getInterestingArticleById,
  InterestingArticleReferenceError,
  updateInterestingArticle,
} from "@/services/interesting-articles";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) return authResponse;
    const article = await getInterestingArticleById((await params).id);
    if (!article) return NextResponse.json({ error: "Статья не найдена" }, { status: 404 });
    return NextResponse.json({ data: article });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке интересной статьи" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) return authResponse;
    const parsed = updateInterestingArticleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: zodIssuesToUserMessage(parsed.error.issues) }, { status: 400 });
    }
    const article = await updateInterestingArticle((await params).id, parsed.data);
    if (!article) return NextResponse.json({ error: "Статья не найдена" }, { status: 404 });
    return NextResponse.json({ data: article });
  } catch (error) {
    if (error instanceof InterestingArticleReferenceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Ошибка при обновлении интересной статьи" }, { status: 500 });
  }
}

export const PUT = PATCH;

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) return authResponse;
    const deleted = await deleteInterestingArticle((await params).id);
    if (!deleted) return NextResponse.json({ error: "Статья не найдена" }, { status: 404 });
    return NextResponse.json({ message: "Статья удалена" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при удалении интересной статьи" }, { status: 500 });
  }
}
