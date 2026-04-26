import { assertDatabaseConfigured, execute, isDatabaseConfigured, normalizeTimestamp } from "@/lib/db";
import { getDevPlaceById, insertDevReport, listDevReports, listDevReviews, updateDevReportStatus } from "@/lib/dev-store";
import type { Report, EntityType, ReportReason } from "@/types";
import { v4 as uuid } from "uuid";

export async function createReport(data: {
  entity_type: EntityType;
  entity_id: string;
  reason: ReportReason;
  comment?: string;
}): Promise<{ id: string }> {
  const id = uuid();

  if (!isDatabaseConfigured()) {
    insertDevReport({
      id,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      reason: data.reason,
      comment: data.comment || null,
      created_by: null,
      session_id: null,
      status: "pending",
      created_at: new Date().toISOString(),
    });

    return { id };
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to save reports.");

  await execute(`
    INSERT INTO reports (id, entity_type, entity_id, reason, comment, status)
    VALUES ($1, $2, $3, $4, $5, 'pending')
  `, [id, data.entity_type, data.entity_id, data.reason, data.comment || null]);

  return { id };
}

export async function getPendingReports(): Promise<(Report & { entity_title?: string })[]> {
  if (!isDatabaseConfigured()) {
    const reviews = listDevReviews();
    return listDevReports("pending").map((report) => ({
      ...report,
      entity_title:
        report.entity_type === "place"
          ? getDevPlaceById(report.entity_id)?.title
          : reviews.find((review) => review.id === report.entity_id)?.text?.slice(0, 50),
    }));
  }

  const rows = await execute<Report & { entity_title?: string; created_at: string | Date }>(`
    SELECT
      r.*,
      CASE
        WHEN r.entity_type = 'place' THEN p.title
        ELSE LEFT(rv.text, 50)
      END as entity_title
    FROM reports r
    LEFT JOIN places p ON r.entity_type = 'place' AND p.id = r.entity_id
    LEFT JOIN reviews rv ON r.entity_type = 'review' AND rv.id = r.entity_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at DESC
  `);

  return rows.map((row) => ({
    ...row,
    created_at: normalizeTimestamp(row.created_at) || new Date(0).toISOString(),
  }));
}

export async function updateReportStatus(id: string, status: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    const updated = updateDevReportStatus(id, status as Report["status"]);
    if (!updated) {
      throw new Error("Жалоба не найдена");
    }
    return;
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to moderate reports.");
  await execute("UPDATE reports SET status = $1 WHERE id = $2", [status, id]);
}
