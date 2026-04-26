import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminUpdatePlaceSchema } from "@/schemas";
import { getPlaceById, updatePlace } from "@/services/places";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) {
      return authResponse;
    }

    const { id } = await params;
    const place = await getPlaceById(id);
    if (!place) {
      return NextResponse.json({ error: "Место не найдено" }, { status: 404 });
    }

    return NextResponse.json({ data: place });
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
    const parsed = adminUpdatePlaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
    }

    await updatePlace(id, parsed.data);
    return NextResponse.json({ message: "Место обновлено" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при обновлении места" }, { status: 500 });
  }
}
