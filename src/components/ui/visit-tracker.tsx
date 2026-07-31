"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function shouldTrack(pathname: string): boolean {
  return pathname.startsWith("/") && !pathname.startsWith("/admin");
}

export function VisitTracker() {
  const pathname = usePathname();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || !shouldTrack(pathname) || lastTrackedRef.current === pathname) {
      return;
    }

    lastTrackedRef.current = pathname;
    const search = new URLSearchParams(window.location.search);
    let referrerHost = "";
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer && referrer.origin !== window.location.origin) {
        referrerHost = referrer.hostname;
      }
    } catch {
      referrerHost = "";
    }

    void fetch("/api/metrics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrerHost,
        utmSource: search.get("utm_source"),
        utmMedium: search.get("utm_medium"),
        utmCampaign: search.get("utm_campaign"),
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
