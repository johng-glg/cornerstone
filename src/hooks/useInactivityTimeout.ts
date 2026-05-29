import { useCallback, useEffect, useRef, useState } from "react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
const CROSS_TAB_KEY = "cornerstone.lastActivityAt";

interface UseInactivityTimeoutOptions {
  /** Total idle time before sign-out (ms). */
  idleMs: number;
  /** How long before timeout the warning is shown (ms). */
  warningMs: number;
  /** When false, the timer is not armed (e.g. on auth pages). */
  enabled: boolean;
  /** Called when the idle deadline is reached. */
  onTimeout: () => void;
}

interface UseInactivityTimeoutResult {
  /** Whether the pre-timeout warning is currently showing. */
  warning: boolean;
  /** Milliseconds remaining until sign-out (only meaningful while `warning`). */
  remainingMs: number;
  /** Reset the idle clock (e.g. "Stay signed in"). */
  reset: () => void;
}

/**
 * Client-side idle-logout timer with a pre-timeout warning and cross-tab coordination.
 * Activity in any tab resets the shared clock via localStorage. This is a UX/session-hygiene
 * guard; server-side JWT lifetime is unaffected.
 */
export function useInactivityTimeout({
  idleMs,
  warningMs,
  enabled,
  onTimeout,
}: UseInactivityTimeoutOptions): UseInactivityTimeoutResult {
  const [warning, setWarning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(idleMs);
  const lastActivityRef = useRef<number>(Date.now());
  const lastWriteRef = useRef<number>(0);
  const timedOutRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const reset = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    timedOutRef.current = false;
    setWarning(false);
    setRemainingMs(idleMs);
    // Throttle cross-tab writes to at most once per second.
    if (now - lastWriteRef.current > 1000) {
      lastWriteRef.current = now;
      try {
        localStorage.setItem(CROSS_TAB_KEY, String(now));
      } catch {
        // ignore storage failures (private mode, quota)
      }
    }
  }, [idleMs]);

  useEffect(() => {
    if (!enabled) return;

    const onActivity = () => reset();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const onStorage = (e: StorageEvent) => {
      if (e.key === CROSS_TAB_KEY && e.newValue) {
        const ts = Number(e.newValue);
        if (!Number.isNaN(ts) && ts > lastActivityRef.current) {
          lastActivityRef.current = ts;
          setWarning(false);
        }
      }
    };
    window.addEventListener("storage", onStorage);

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const left = idleMs - elapsed;
      if (left <= 0) {
        if (!timedOutRef.current) {
          timedOutRef.current = true;
          onTimeoutRef.current();
        }
      } else if (left <= warningMs) {
        setWarning(true);
        setRemainingMs(left);
      } else if (warning) {
        setWarning(false);
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
    // `warning` intentionally excluded: the interval reads it via closure each tick and we
    // don't want to tear down/rebuild listeners on every warning toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, idleMs, warningMs, reset]);

  return { warning, remainingMs, reset };
}
