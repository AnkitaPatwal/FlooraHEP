import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { consumeAssignmentCountsStale } from "../lib/assignmentsCountsStale";

/**
 * Bump a token when the user likely returns from assign-package flows so list pages
 * refetch client-assignment counts (tab visible again, window focus, bfcache restore).
 */
export function useAssignmentCountsRefresh() {
  const location = useLocation();
  const [refreshToken, setRefreshToken] = useState(() => {
    if (typeof window === "undefined") return 0;
    return consumeAssignmentCountsStale() ? 1 : 0;
  });
  const lastBumpRef = useRef(0);

  const bump = useCallback(() => {
    const now = Date.now();
    if (now - lastBumpRef.current < 450) return;
    lastBumpRef.current = now;
    setRefreshToken((n) => n + 1);
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (consumeAssignmentCountsStale()) bump();
      bump();
    };
    const onFocus = () => {
      if (consumeAssignmentCountsStale()) bump();
      bump();
    };
    const onPageShow = (e: Event) => {
      if ((e as PageTransitionEvent).persisted) bump();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [bump]);

  return { location, refreshToken };
}
