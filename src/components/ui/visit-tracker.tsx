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
    void fetch("/api/metrics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
