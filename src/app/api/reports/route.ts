import { NextResponse } from "next/server";
import { getPendingReports, updateReportStatus } from "@/services/reports";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    const authResponse = requireAdmin(request);
    if (authResponse) {
      return authResponse;
    }

    const reports = await getPendingReports();
    return NextResponse.json({ data: reports });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при загрузке жалоб" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResponse = requireAdmin(req);
    if (authResponse) {
      return authResponse;
    }

    const { id, status } = await req.json();
    await updateReportStatus(id, status);
    return NextResponse.json({ message: "Статус обновлён" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
