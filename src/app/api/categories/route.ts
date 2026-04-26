import { NextResponse } from "next/server";
import { getCategories } from "@/services/categories";

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json({ data: categories });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при загрузке категорий" }, { status: 500 });
  }
}
