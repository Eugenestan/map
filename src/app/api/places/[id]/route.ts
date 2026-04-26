import { NextRequest, NextResponse } from "next/server";
import { getPlaceById } from "@/services/places";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const place = await getPlaceById(id);
    if (!place) {
      return NextResponse.json({ error: "Место не найдено" }, { status: 404 });
    }
    return NextResponse.json({ data: place });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при загрузке места" }, { status: 500 });
  }
}
