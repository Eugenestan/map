"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, MousePointerClick, TrendingDown, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AnalyticsAction, AnalyticsDevice, AnalyticsSummary } from "@/services/analytics";

const PERIODS = [7, 30, 90] as const;
const DEVICE_LABELS: Record<AnalyticsDevice, string> = {
  mobile: "Мобильные",
  desktop: "Компьютеры",
  tablet: "Планшеты",
  other: "Другие",
};
const ACTION_LABELS: Record<AnalyticsAction, string> = {
  route: "Маршрут",
  phone: "Телефон",
  website: "Сайт",
  telegram: "Telegram",
  share: "Поделиться",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function delta(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function Delta({ current, previous }: { current: number; previous: number }) {
  const value = delta(current, previous);
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", positive ? "text-emerald-600" : "text-red-600")}>
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}
      {value}%
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  previous,
  hint,
}: {
  label: string;
  value: number | string;
  icon: typeof Eye;
  previous?: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold leading-none text-zinc-900">
          {typeof value === "number" ? formatNumber(value) : value}
        </p>
        {typeof value === "number" && previous !== undefined ? (
          <Delta current={value} previous={previous} />
        ) : (
          hint && <span className="text-xs text-zinc-400">{hint}</span>
        )}
      </div>
    </div>
  );
}

function TrafficChart({ data }: { data: AnalyticsSummary["timeseries"] }) {
  const width = 720;
  const height = 170;
  const padding = 16;
  const max = Math.max(...data.flatMap((point) => [point.views, point.uniqueVisitors]), 1);
  const point = (value: number, index: number) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (value / max) * (height - padding * 2);
    return `${x},${y}`;
  };
  const views = data.map((item, index) => point(item.views, index)).join(" ");
  const unique = data.map((item, index) => point(item.uniqueVisitors, index)).join(" ");
  const labelIndexes = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])];

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-600" />Просмотры</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Уникальные</span>
      </div>
      <div className="mt-2 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height + 22}`} className="h-48 w-full" role="img" aria-label="Динамика посещений">
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={padding}
              x2={width - padding}
              y1={height - padding - ratio * (height - padding * 2)}
              y2={height - padding - ratio * (height - padding * 2)}
              stroke="#e4e4e7"
              strokeDasharray="4 4"
            />
          ))}
          <polyline points={views} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={unique} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((item, index) => {
            const [x, y] = point(item.views, index).split(",");
            return (
              <circle key={item.day} cx={x} cy={y} r="3" fill="#2563eb">
                <title>{item.day}: {item.views} просмотров, {item.uniqueVisitors} уникальных</title>
              </circle>
            );
          })}
          {labelIndexes.map((index) => {
            const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
            return (
              <text key={data[index]?.day} x={x} y={height + 14} textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"} fontSize="11" fill="#71717a">
                {data[index]?.day.slice(5).split("-").reverse().join(".")}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function Breakdown({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
  emptyText: string;
}) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      {items.length ? (
        <div className="mt-3 space-y-2.5">
          {items.slice(0, 5).map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-zinc-600">{item.label}</span>
                <span className="font-medium text-zinc-800">{formatNumber(item.count)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max((item.count / max) * 100, 3)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-400">{emptyText}</p>
      )}
    </div>
  );
}

export function AdminAnalyticsPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(7);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loadedRequest, setLoadedRequest] = useState<string | null>(null);
  const requestKey = `${days}:${refreshKey}`;
  const loading = loadedRequest !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/metrics/visits?days=${days}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Не удалось загрузить статистику");
        return response.json();
      })
      .then((body) => setSummary(body.data ?? null))
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") console.error(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedRequest(requestKey);
      });
    return () => controller.abort();
  }, [days, refreshKey, requestKey]);

  const actionsCount = useMemo(
    () => summary?.actions.reduce((total, item) => total + item.count, 0) ?? 0,
    [summary],
  );
  const conversion = summary?.current.views ? `${((actionsCount / summary.current.views) * 100).toFixed(1)}%` : "0%";

  if (!summary && loading) {
    return <div className="mb-6 h-56 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />;
  }
  if (!summary) return null;

  return (
    <section className={cn("mb-6 space-y-3 transition-opacity", loading && "opacity-60")} aria-label="Статистика посещений">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Посещаемость</h2>
          <p className="text-xs text-zinc-500">Сравнение с предыдущим периодом</p>
        </div>
        <div className="flex rounded-lg border border-zinc-200 bg-white p-1">
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setDays(period)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                days === period ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100",
              )}
            >
              {period} дней
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Просмотры" value={summary.current.views} previous={summary.previous.views} icon={Eye} />
        <MetricCard label="Уникальные" value={summary.current.uniqueVisitors} previous={summary.previous.uniqueVisitors} icon={Users} />
        <MetricCard label="Сегодня" value={summary.today.views} hint={`${summary.today.uniqueVisitors} уник.`} icon={TrendingUp} />
        <MetricCard label="Целевые действия" value={actionsCount} hint={`${conversion} от просмотров`} icon={MousePointerClick} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900">Динамика</h3>
          <TrafficChart data={summary.timeseries} />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Топ страниц</h3>
          <div className="mt-3 space-y-2">
            {summary.topPages.slice(0, 6).map((page) => (
              <div key={page.path} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs">
                <span className="truncate text-zinc-700" title={page.path}>{page.path}</span>
                <span className="shrink-0 font-medium text-zinc-600">{formatNumber(page.views)}</span>
              </div>
            ))}
            {!summary.topPages.length && <p className="text-xs text-zinc-400">Пока нет данных</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Breakdown title="Источники" items={summary.sources} emptyText="Данные появятся после новых визитов" />
        <Breakdown
          title="Устройства"
          items={summary.devices.map((item) => ({ ...item, label: DEVICE_LABELS[item.label] ?? item.label }))}
          emptyText="Данные появятся после новых визитов"
        />
        <Breakdown
          title="Целевые действия"
          items={summary.actions.map((item) => ({ ...item, label: ACTION_LABELS[item.label] ?? item.label }))}
          emptyText="Кликов пока не было"
        />
      </div>
    </section>
  );
}
