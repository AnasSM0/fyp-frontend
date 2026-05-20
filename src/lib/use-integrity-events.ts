"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  canUseIntegrityDemoFallback,
  submitIntegrityEventsBatch,
} from "@/lib/api/integrity-service";
import { IntegrityEventCreate, IntegrityEventType } from "@/lib/api/types";

const BATCH_INTERVAL_MS = 7000;
const DUPLICATE_WINDOW_MS = 3000;
const INACTIVITY_MS = 60000;

export function useIntegrityEvents(sessionId: string | null, enabled: boolean) {
  const queueRef = useRef<IntegrityEventCreate[]>([]);
  const lastEventAtRef = useRef<Record<string, number>>({});
  const lastActivityAtRef = useRef(Date.now());
  const sessionIdRef = useRef(sessionId);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    sessionIdRef.current = sessionId;
    enabledRef.current = enabled;
  }, [enabled, sessionId]);

  const recordIntegrityEvent = useCallback(
    (
      eventType: IntegrityEventType,
      details: Record<string, unknown> = {},
      durationMs = 0
    ) => {
      const activeSessionId = sessionIdRef.current;
      if (!enabledRef.current || !activeSessionId) return;

      const now = Date.now();
      const key = `${eventType}:${JSON.stringify(details)}`;
      if (now - (lastEventAtRef.current[key] ?? 0) < DUPLICATE_WINDOW_MS) return;

      lastEventAtRef.current[key] = now;
      queueRef.current.push({
        session_id: activeSessionId,
        event_type: eventType,
        details_json: details,
        duration_ms: durationMs,
        occurred_at: new Date(now).toISOString(),
      });
    },
    []
  );

  const flushIntegrityEvents = useCallback(async () => {
    if (!queueRef.current.length) return;
    const events = queueRef.current.splice(0, queueRef.current.length);

    try {
      await submitIntegrityEventsBatch({ events });
    } catch (error) {
      if (!canUseIntegrityDemoFallback(error)) {
        queueRef.current = [...events, ...queueRef.current].slice(0, 100);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const markActivity = () => {
      lastActivityAtRef.current = Date.now();
    };
    const onVisibilityChange = () => {
      if (document.hidden) recordIntegrityEvent("TAB_HIDDEN");
    };
    const onBlur = () => recordIntegrityEvent("WINDOW_BLUR");
    const onPaste = () => recordIntegrityEvent("PASTE_ATTEMPT");
    const onCopy = () => recordIntegrityEvent("COPY_ATTEMPT");
    const onContextMenu = () => recordIntegrityEvent("RIGHT_CLICK");

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("paste", onPaste);
    window.addEventListener("copy", onCopy);
    window.addEventListener("cut", onCopy);
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("mousemove", markActivity);
    window.addEventListener("mousedown", markActivity);

    const batchTimer = window.setInterval(() => {
      void flushIntegrityEvents();
    }, BATCH_INTERVAL_MS);
    const inactivityTimer = window.setInterval(() => {
      const inactiveFor = Date.now() - lastActivityAtRef.current;
      if (inactiveFor >= INACTIVITY_MS) {
        recordIntegrityEvent("LONG_INACTIVITY", { threshold_ms: INACTIVITY_MS }, inactiveFor);
        lastActivityAtRef.current = Date.now();
      }
    }, 15000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("cut", onCopy);
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("mousedown", markActivity);
      window.clearInterval(batchTimer);
      window.clearInterval(inactivityTimer);
      void flushIntegrityEvents();
    };
  }, [enabled, flushIntegrityEvents, recordIntegrityEvent, sessionId]);

  return { flushIntegrityEvents, recordIntegrityEvent };
}
