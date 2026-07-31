import { assertDatabaseConfigured, execute, isDatabaseConfigured } from "@/lib/db";
import {
  listDevAnalyticsEvents,
  listDevVisitStats,
  trackDevAnalyticsEvent,
  type DevAnalyticsEvent,
} from "@/lib/dev-store";

const ANALYTICS_TIME_ZONE = "Asia/Ho_Chi_Minh";

export type AnalyticsDevice = "mobile" | "desktop" | "tablet" | "other";
export type AnalyticsAction = "route" | "phone" | "website" | "telegram" | "share";

export interface AnalyticsEventInput {
  eventType: "page_view" | "action";
  path: string;
  visitorId: string;
  userAgent?: string | null;
  target?: AnalyticsAction | null;
  entityId?: string | null;
  referrerHost?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

interface VisitMetricRow {
  day: string;
  path: string;
  visits: number;
  unique_visitors: number;
}

interface EventUniqueRow {
  current_page_views: number;
  current_unique: number;
  previous_page_views: number;
  previous_unique: number;
  today_page_views: number;
  today_unique: number;
}

interface EventDailyRow {
  day: string;
  views: number;
  unique_visitors: number;
}

interface BreakdownRow {
  label: string;
  count: number;
}

export interface AnalyticsSummary {
  periodDays: number;
  current: { views: number; uniqueVisitors: number };
  previous: { views: number; uniqueVisitors: number };
  today: { views: number; uniqueVisitors: number };
  timeseries: Array<{ day: string; views: number; uniqueVisitors: number }>;
  topPages: Array<{ path: string; views: number; uniqueVisitors: number }>;
  sources: Array<{ label: string; count: number }>;
  devices: Array<{ label: AnalyticsDevice; count: number }>;
  actions: Array<{ label: AnalyticsAction; count: number }>;
}

function dayKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ANALYTICS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shiftDay(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function normalizeAnalyticsPath(input: string): string {
  const path = input.trim().split("?")[0].slice(0, 500);
  if (!path || !path.startsWith("/")) return "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function detectDeviceType(userAgent = ""): AnalyticsDevice {
  if (/ipad|tablet|playbook|silk/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|ipod|android/i.test(userAgent)) return "mobile";
  if (userAgent) return "desktop";
  return "other";
}

export function isLikelyBot(userAgent = ""): boolean {
  return /bot|crawler|spider|slurp|preview|facebookexternalhit|headlesschrome|lighthouse/i.test(userAgent);
}

function cleanDimension(value?: string | null, maxLength = 200): string | null {
  const cleaned = value?.trim().slice(0, maxLength);
  return cleaned || null;
}

export async function recordAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
  const event: DevAnalyticsEvent = {
    occurred_at: new Date().toISOString(),
    event_type: input.eventType,
    path: normalizeAnalyticsPath(input.path),
    target: input.target ?? null,
    entity_id: cleanDimension(input.entityId, 100),
    visitor_id: input.visitorId,
    referrer_host: cleanDimension(input.referrerHost),
    utm_source: cleanDimension(input.utmSource),
    utm_medium: cleanDimension(input.utmMedium),
    utm_campaign: cleanDimension(input.utmCampaign),
    device_type: detectDeviceType(input.userAgent ?? ""),
  };

  if (!isDatabaseConfigured()) {
    trackDevAnalyticsEvent(event);
    return;
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to track analytics.");
  await execute(
    `
      INSERT INTO analytics_events (
        occurred_at, event_type, path, target, entity_id, visitor_id,
        referrer_host, utm_source, utm_medium, utm_campaign, device_type
      )
      VALUES (
        $1::timestamptz, $2, $3, $4, $5, $6::uuid,
        $7, $8, $9, $10, $11
      )
    `,
    [
      event.occurred_at,
      event.event_type,
      event.path,
      event.target,
      event.entity_id,
      event.visitor_id,
      event.referrer_host,
      event.utm_source,
      event.utm_medium,
      event.utm_campaign,
      event.device_type,
    ],
  );
}

function sumVisitRows(rows: VisitMetricRow[]) {
  return rows.reduce(
    (total, row) => ({
      views: total.views + Number(row.visits),
      uniqueVisitors: total.uniqueVisitors + Number(row.unique_visitors),
    }),
    { views: 0, uniqueVisitors: 0 },
  );
}

function topPages(rows: VisitMetricRow[]) {
  const grouped = new Map<string, { views: number; uniqueVisitors: number }>();
  for (const row of rows) {
    const current = grouped.get(row.path) ?? { views: 0, uniqueVisitors: 0 };
    current.views += Number(row.visits);
    current.uniqueVisitors += Number(row.unique_visitors);
    grouped.set(row.path, current);
  }
  return [...grouped.entries()]
    .map(([path, values]) => ({ path, ...values }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
}

function buildBaseSummary(rows: VisitMetricRow[], days: number): AnalyticsSummary {
  const todayDay = dayKey();
  const currentStart = shiftDay(todayDay, -(days - 1));
  const previousStart = shiftDay(currentStart, -days);
  const currentRows = rows.filter((row) => row.day >= currentStart);
  const previousRows = rows.filter((row) => row.day >= previousStart && row.day < currentStart);
  const current = sumVisitRows(currentRows);
  const previous = sumVisitRows(previousRows);
  const today = sumVisitRows(rows.filter((row) => row.day === todayDay));
  const byDay = new Map<string, { views: number; uniqueVisitors: number }>();

  for (const row of currentRows) {
    const value = byDay.get(row.day) ?? { views: 0, uniqueVisitors: 0 };
    value.views += Number(row.visits);
    value.uniqueVisitors += Number(row.unique_visitors);
    byDay.set(row.day, value);
  }

  return {
    periodDays: days,
    current,
    previous,
    today,
    timeseries: Array.from({ length: days }, (_, index) => {
      const day = shiftDay(currentStart, index);
      return { day, ...(byDay.get(day) ?? { views: 0, uniqueVisitors: 0 }) };
    }),
    topPages: topPages(currentRows),
    sources: [],
    devices: [],
    actions: [],
  };
}

function eventDay(event: DevAnalyticsEvent): string {
  return dayKey(new Date(event.occurred_at));
}

function breakdown<T extends string>(values: T[], limit = 8): Array<{ label: T; count: number }> {
  const grouped = new Map<T, number>();
  for (const value of values) grouped.set(value, (grouped.get(value) ?? 0) + 1);
  return [...grouped.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function applyDevEvents(summary: AnalyticsSummary, events: DevAnalyticsEvent[]): AnalyticsSummary {
  const todayDay = dayKey();
  const currentStart = shiftDay(todayDay, -(summary.periodDays - 1));
  const previousStart = shiftDay(currentStart, -summary.periodDays);
  const pageViews = events.filter((event) => event.event_type === "page_view");
  const currentEvents = pageViews.filter((event) => eventDay(event) >= currentStart);
  const previousEvents = pageViews.filter((event) => {
    const day = eventDay(event);
    return day >= previousStart && day < currentStart;
  });
  const todayEvents = currentEvents.filter((event) => eventDay(event) === todayDay);
  const unique = (items: DevAnalyticsEvent[]) => new Set(items.map((event) => event.visitor_id)).size;

  if (currentEvents.length) summary.current.uniqueVisitors = unique(currentEvents);
  if (previousEvents.length) summary.previous.uniqueVisitors = unique(previousEvents);
  if (todayEvents.length) summary.today.uniqueVisitors = unique(todayEvents);

  for (const point of summary.timeseries) {
    const dailyEvents = currentEvents.filter((event) => eventDay(event) === point.day);
    if (dailyEvents.length) point.uniqueVisitors = unique(dailyEvents);
  }

  summary.sources = breakdown(
    currentEvents.map((event) => event.utm_source || event.referrer_host || "Прямые заходы"),
  );
  summary.devices = breakdown(currentEvents.map((event) => event.device_type)) as AnalyticsSummary["devices"];
  summary.actions = breakdown(
    events
      .filter((event) => event.event_type === "action" && eventDay(event) >= currentStart && event.target)
      .map((event) => event.target as AnalyticsAction),
  ) as AnalyticsSummary["actions"];
  return summary;
}

export async function getAnalyticsSummary(requestedDays = 7): Promise<AnalyticsSummary> {
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 7;

  if (!isDatabaseConfigured()) {
    return applyDevEvents(buildBaseSummary(listDevVisitStats(days * 2), days), listDevAnalyticsEvents());
  }

  const todayDay = dayKey();
  const currentStart = shiftDay(todayDay, -(days - 1));
  const previousStart = shiftDay(currentStart, -days);
  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to read analytics.");

  const [visitRows, uniqueRows, dailyRows, sourceRows, deviceRows, actionRows] = await Promise.all([
    execute<VisitMetricRow>(
      `
        SELECT day::text, path, visits, unique_visitors
        FROM site_visits
        WHERE day >= $1::date
        ORDER BY day ASC, path ASC
      `,
      [previousStart],
    ),
    execute<EventUniqueRow>(
      `
        SELECT
          COUNT(*) FILTER (WHERE event_type = 'page_view' AND (occurred_at AT TIME ZONE '${ANALYTICS_TIME_ZONE}')::date >= $1::date)::int AS current_page_views,
          COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view' AND (occurred_at AT TIME ZONE '${ANALYTICS_TIME_ZONE}')::date >= $1::date)::int AS current_unique,
          COUNT(*) FILTER (WHERE event_type = 'page_view' AND (occurred_at AT TIME ZONE '${ANALYTICS_TIME_ZONE}')::date >= $2::date AND (occurred_at AT TIME ZONE '${ANALYTICS_TIME_ZONE}')::date < $1::date)::int AS previous_page_views,
          COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view' AND (occurred_at AT TIME ZONE '${ANALYTICS_TIME_ZONE}')::date >= $2::date AND (occurred_at AT TIME ZONE '${ANALYTICS_TIME_ZONE}')::date < $1::date)::int AS previous_unique,
          COUNT(*) FILTER (WHERE event_type = 'page_view' AND (occurred_at AT TIME ZONE '${ANALYTICS_TIME_ZONE}')::date = $3::date)::int AS today_page_views,
          COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view' AND (occurred_at AT TIME ZONE '${ANALYTICS_TIME_ZONE}')::date = $3::date)::int AS today_unique
        FROM analytics_events
        WHERE occurred_at >= $2::date
      `,
      [currentStart, previousStart, todayDay],
    ),
    execute<EventDailyRow>(
      `
        SELECT
          (occurred_at AT TIME ZONE '${ANALYTICS_TIME_ZONE}')::date::text AS day,
          COUNT(*)::int AS views,
          COUNT(DISTINCT visitor_id)::int AS unique_visitors
        FROM analytics_events
        WHERE event_type = 'page_view'
          AND (occurred_at AT TIME ZONE '${ANALYTICS_TIME_ZONE}')::date >= $1::date
        GROUP BY 1
        ORDER BY 1
      `,
      [currentStart],
    ),
    execute<BreakdownRow>(
      `
        SELECT COALESCE(NULLIF(utm_source, ''), NULLIF(referrer_host, ''), 'Прямые заходы') AS label, COUNT(*)::int AS count
        FROM analytics_events
        WHERE event_type = 'page_view'
          AND (occurred_at AT TIME ZONE '${ANALYTICS_TIME_ZONE}')::date >= $1::date
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 8
      `,
      [currentStart],
    ),
    execute<BreakdownRow>(
      `
        SELECT device_type AS label, COUNT(*)::int AS count
        FROM analytics_events
        WHERE event_type = 'page_view'
          AND (occurred_at AT TIME ZONE '${ANALYTICS_TIME_ZONE}')::date >= $1::date
        GROUP BY 1
        ORDER BY count DESC
      `,
      [currentStart],
    ),
    execute<BreakdownRow>(
      `
        SELECT target AS label, COUNT(*)::int AS count
        FROM analytics_events
        WHERE event_type = 'action'
          AND target IS NOT NULL
          AND (occurred_at AT TIME ZONE '${ANALYTICS_TIME_ZONE}')::date >= $1::date
        GROUP BY 1
        ORDER BY count DESC
      `,
      [currentStart],
    ),
  ]);

  const summary = buildBaseSummary(visitRows, days);
  const uniques = uniqueRows[0];
  if (uniques?.current_page_views) summary.current.uniqueVisitors = Number(uniques.current_unique);
  if (uniques?.previous_page_views) summary.previous.uniqueVisitors = Number(uniques.previous_unique);
  if (uniques?.today_page_views) summary.today.uniqueVisitors = Number(uniques.today_unique);
  const exactDaily = new Map(dailyRows.map((row) => [row.day, Number(row.unique_visitors)]));
  summary.timeseries = summary.timeseries.map((point) => ({
    ...point,
    uniqueVisitors: exactDaily.get(point.day) ?? point.uniqueVisitors,
  }));
  summary.sources = sourceRows.map((row) => ({ label: row.label, count: Number(row.count) }));
  summary.devices = deviceRows.map((row) => ({
    label: row.label as AnalyticsDevice,
    count: Number(row.count),
  }));
  summary.actions = actionRows.map((row) => ({
    label: row.label as AnalyticsAction,
    count: Number(row.count),
  }));
  return summary;
}
