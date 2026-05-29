// Pure Forth helpers (no supabase-js / no I/O) — unit-tested under `deno test`.
// The credential-aware OAuth/HTTP wiring lives in forthAuth.ts.

/** Strip whitespace/newlines from a secret (Forth keys were historically pasted with a trailing newline). */
export function normalizeSecret(s: string): string {
  return s.replace(/[\r\n\s]+/g, "");
}

/** Forth's OAuth response shape has varied; the token can live in any of several paths. */
export interface ForthTokenResponse {
  response?: { access_token?: string; api_key?: string };
  access_token?: string;
  api_key?: string;
  data?: { access_token?: string };
  token?: string;
}

/** Extract the access token from a parsed Forth OAuth response, or null if absent. */
export function extractAccessToken(data: ForthTokenResponse): string | null {
  return (
    data?.response?.access_token ??
    data?.response?.api_key ??
    data?.access_token ??
    data?.api_key ??
    data?.data?.access_token ??
    data?.token ??
    null
  );
}

/** Exponential backoff schedule for Forth 429 retries. */
export const BACKOFF_MS = [1000, 4000, 16000] as const;

/**
 * Wait time for a given retry attempt: honor a numeric `Retry-After` (seconds) when present,
 * otherwise fall back to the backoff schedule.
 */
export function backoffWaitMs(attempt: number, retryAfter?: string | null): number {
  const fallback = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
  if (retryAfter == null || retryAfter === "") return fallback;
  const n = Number(retryAfter);
  return Number.isNaN(n) ? fallback : n * 1000;
}
