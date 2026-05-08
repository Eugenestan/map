import { assertDatabaseConfigured, execute, isDatabaseConfigured } from "@/lib/db";
import { listDevVisitStats, trackDevVisit } from "@/lib/dev-store";

interface VisitMetricRow {
  day: string;
  path: string;
  visits: number;
  unique_visitors: number;
}

export interface VisitSummary {
  todayVisits: number;
  todayUniqueVisitors: number;
  weekVisits: number;
  weekUniqueVisitors: number;
  topPages: Array<{
    path: string;
    visits: number;
    uniqueVisitors: number;
  }>;
}

function getDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function normalizePath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || !trimmed.startsWith("/")) {
    return "/";
  }
  if (trimmed.length > 1 && trimmed.endsWith("/")) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

export async function registerVisit(rawPath: string, sessionId: string, isUniqueVisitor: boolean): Promise<void> {
  const path = normalizePath(rawPath);
  const day = getDayKey();

  if (!isDatabaseConfigured()) {
    trackDevVisit(path, sessionId, day, isUniqueVisitor);
    return;
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to track visits.");
  await execute(
    `
      INSERT INTO site_visits (day, path, visits, unique_visitors)
      VALUES ($1::date, $2, 1, 1)
      ON CONFLICT (day, path)
      DO UPDATE SET
        visits = site_visits.visits + 1,
        unique_visitors = site_visits.unique_visitors + $3::int
    `,
    [day, path, isUniqueVisitor ? 1 : 0],
  );
}

function buildSummary(rows: VisitMetricRow[]): VisitSummary {
  const today = getDayKey();
  const byPath = new Map<string, { visits: number; uniqueVisitors: number }>();

  let todayVisits = 0;
  let todayUniqueVisitors = 0;
  let weekVisits = 0;
  let weekUniqueVisitors = 0;

  for (const row of rows) {
    weekVisits += Number(row.visits);
    weekUniqueVisitors += Number(row.unique_visitors);
    if (row.day === today) {
      todayVisits += Number(row.visits);
      todayUniqueVisitors += Number(row.unique_visitors);
    }

    const current = byPath.get(row.path) ?? { visits: 0, uniqueVisitors: 0 };
    current.visits += Number(row.visits);
    current.uniqueVisitors += Number(row.unique_visitors);
    byPath.set(row.path, current);
  }

  const topPages = [...byPath.entries()]
    .map(([path, value]) => ({ path, visits: value.visits, uniqueVisitors: value.uniqueVisitors }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10);

  return {
    todayVisits,
    todayUniqueVisitors,
    weekVisits,
    weekUniqueVisitors,
    topPages,
  };
}

export async function getVisitSummary(days = 7): Promise<VisitSummary> {
  if (!isDatabaseConfigured()) {
    return buildSummary(listDevVisitStats(days));
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to read visit stats.");
  const rows = await execute<VisitMetricRow>(
    `
      SELECT
        day::text as day,
        path,
        visits,
        unique_visitors
      FROM site_visits
      WHERE day >= CURRENT_DATE - ($1::int - 1)
      ORDER BY day DESC, path ASC
    `,
    [days],
  );

  return buildSummary(rows);
}
