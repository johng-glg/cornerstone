import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Tracks user inactivity and fires warning + timeout callbacks.
 *
 * - `idleMs`: total ms of inactivity before forced sign-out.
 * - `warningMs`: ms before timeout to show the warning dialog.
 *
 * Activity is tracked across tabs via localStorage so a user typing in one
 * tab keeps the others alive. Throttled to one write per second.
 */
const ACTIVITY_KEY = 'glg.lastActivityAt';
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

export interface UseInactivityTimeoutOptions {
  idleMs: number;
  warningMs: number;
  enabled?: boolean;
  onTimeout: () => void;
}

export interface InactivityTimeoutState {
  /** True when the warning window is active (remaining <= warningMs). */
  warning: boolean;
  /** Remaining ms until forced sign-out. */
  remainingMs: number;
  /** Reset the idle timer (e.g. user clicked "Stay signed in"). */
  reset: () => void;
}

export function useInactivityTimeout({
  idleMs,
  warningMs,
  enabled = true,
  onTimeout,
}: UseInactivityTimeoutOptions): InactivityTimeoutState {
  const [warning, setWarning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(idleMs);
  const lastActivityRef = useRef<number>(Date.now());
  const lastWriteRef = useRef<number>(0);
  const firedRef = useRef(false);

  const markActivity = useCallback(
    (write = true) => {
      const now = Date.now();
      lastActivityRef.current = now;
      firedRef.current = false;
      if (write && now - lastWriteRef.current > 1000) {
        lastWriteRef.current = now;
        try {
          localStorage.setItem(ACTIVITY_KEY, String(now));
        } catch {
          // ignore
        }
      }
    },
    [],
  );

  const reset = useCallback(() => {
    markActivity(true);
    setWarning(false);
    setRemainingMs(idleMs);
  }, [idleMs, markActivity]);

  // Listen for local activity events
  useEffect(() => {
    if (!enabled) return;
    const handler = () => markActivity(true);
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handler, { passive: true }),
    );
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handler));
    };
  }, [enabled, markActivity]);

  // Listen for cross-tab activity
  useEffect(() => {
    if (!enabled) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVITY_KEY && e.newValue) {
        const ts = Number(e.newValue);
        if (Number.isFinite(ts) && ts > lastActivityRef.current) {
          lastActivityRef.current = ts;
          firedRef.current = false;
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [enabled]);

  // Tick loop: evaluate idle state every second
  useEffect(() => {
    if (!enabled) return;
    markActivity(true);
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, idleMs - elapsed);
      setRemainingMs(remaining);
      setWarning(remaining > 0 && remaining <= warningMs);
      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true;
        onTimeout();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [enabled, idleMs, warningMs, onTimeout, markActivity]);

  return { warning, remainingMs, reset };
}
