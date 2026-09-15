import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

const ENDPOINT = "/api/track-view";

/**
 * Fire-and-forget lankomumo signalas. Be slapukų, be saugyklos.
 * Administravimo maršrutai nesekami, klaidos tylios.
 */
export function usePageTracking() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/staff") ||
      pathname.startsWith("/auth")
    ) {
      return;
    }
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    const payload = JSON.stringify({
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer : "",
    });

    try {
      const blob = new Blob([payload], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon?.(ENDPOINT, blob)) return;
    } catch {
      /* krentam į fetch */
    }

    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* analitika niekada nelaužo puslapio */
    });
  }, [pathname]);
}
