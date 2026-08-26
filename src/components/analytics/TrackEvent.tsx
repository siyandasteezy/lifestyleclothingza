"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Fires one GA4 event when the page mounts.
 *
 * Rendered by server components that already have the data, so the payload is
 * built on the server and this only does the dispatch.
 */
export function TrackEvent({
  event,
  params,
  dedupeKey,
}: {
  event: string;
  params: Record<string, unknown>;
  /**
   * Set for events that must not double-count on a refresh or a back
   * navigation — `purchase` above all, where a reload would otherwise book the
   * same revenue twice. Stored per browser session.
   */
  dedupeKey?: string;
}) {
  const fired = useRef(false);

  useEffect(() => {
    // React runs effects twice in development's strict mode; the ref keeps that
    // from sending two events off one mount.
    if (fired.current) return;
    fired.current = true;

    if (dedupeKey) {
      try {
        const storageKey = `ga:${event}:${dedupeKey}`;
        if (sessionStorage.getItem(storageKey)) return;
        sessionStorage.setItem(storageKey, "1");
      } catch {
        // Private browsing or blocked storage: send the event rather than lose it.
      }
    }

    trackEvent(event, params);
  }, [event, params, dedupeKey]);

  return null;
}
