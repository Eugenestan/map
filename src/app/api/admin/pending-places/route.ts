import { NextRequest, NextResponse } from "next/server";
import { getPendingPlaces } from "@/services/places";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) {
      return authResponse;
    }

    const places = await getPendingPlaces();
    return NextResponse.json({ data: places });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при загрузке мест" }, { status: 500 });
  }
}
