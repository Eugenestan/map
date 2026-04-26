import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getApprovedPlacesForAdmin } from "@/services/places";

export async function GET(request: NextRequest) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) {
      return authResponse;
    }

    const places = await getApprovedPlacesForAdmin();
    return NextResponse.json({ data: places });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка при загрузке одобренных мест" }, { status: 500 });
  }
}
