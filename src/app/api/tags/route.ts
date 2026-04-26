import { NextResponse } from "next/server";
import { getTags } from "@/services/tags";

export async function GET() {
  try {
    const tags = await getTags();
    return NextResponse.json({ data: tags });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при загрузке тегов" }, { status: 500 });
  }
}
