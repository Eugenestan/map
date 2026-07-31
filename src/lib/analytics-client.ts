import type { AnalyticsAction } from "@/services/analytics";

export function trackAction(target: AnalyticsAction, entityId?: string) {
  if (typeof window === "undefined") return;
  void fetch("/api/metrics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target,
      entityId,
      path: window.location.pathname,
    }),
    keepalive: true,
  }).catch(() => undefined);
}
