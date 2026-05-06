import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createArticleSchema, zodIssuesToUserMessage } from "@/schemas";
import { deleteArticle, getArticleById, updateArticle } from "@/services/articles";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) {
      return authResponse;
    }
    const { id } = await params;
    const article = await getArticleById(id);
    if (!article) {
      return NextResponse.json({ error: "Место не найдено" }, { status: 404 });
    }
    return NextResponse.json({ data: article });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке места" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) {
      return authResponse;
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = createArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: zodIssuesToUserMessage(parsed.error.issues) }, { status: 400 });
    }
    await updateArticle(id, parsed.data);
    return NextResponse.json({ message: "Место обновлено" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при обновлении места" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) {
      return authResponse;
    }
    const { id } = await params;
    await deleteArticle(id);
    return NextResponse.json({ message: "Место удалено" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при удалении места" }, { status: 500 });
  }
}
