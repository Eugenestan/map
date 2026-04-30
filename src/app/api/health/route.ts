import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  const status = {
    status: "ok",
    timestamp: new Date().toISOString(),
    database: "unconfigured" as "ok" | "error" | "unconfigured",
  };

  if (isDatabaseConfigured()) {
    try {
      const { getDb } = await import("@/lib/db");
      const sql = getDb();
      await sql`SELECT 1`;
      status.database = "ok";
    } catch {
      status.database = "error";
      return NextResponse.json({ ...status, status: "degraded" }, { status: 503 });
    }
  }

  return NextResponse.json(status);
}
