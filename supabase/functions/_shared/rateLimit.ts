// Shared edge-function rate limiter (Phase D).
// Postgres-backed fixed-window limiter via public.check_rate_limit (service-role only).
// Mirrors the requireAuth pattern: returns a 429 Response when the caller is over the limit,
// or null to proceed. Fail-open on infrastructure error (a limiter outage must not take down
// the function) — but that path is logged so it's visible.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "./cors.ts";

export interface RateLimitOptions {
  /** Logical action name, e.g. "forth-create-draft". */
  bucket: string;
  /** Caller identity: user id, tenant id, or IP. */
  identifier: string;
  /** Max requests allowed per window. */
  maxRequests: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Optional admin client to reuse; one is created if omitted. */
  admin?: SupabaseClient;
}

/**
 * Best-effort client IP for unauthenticated callers (webhooks). Prefers the left-most
 * x-forwarded-for hop, falling back to x-real-ip, then a constant so the limiter still groups
 * unknowns rather than failing open per-request.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function tooManyRequests(req: Request, retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded", retry_after_seconds: retryAfterSeconds }),
    {
      status: 429,
      headers: {
        ...corsHeaders(req),
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(1, retryAfterSeconds)),
      },
    },
  );
}

/**
 * Enforce a rate limit. Returns a 429 Response if the caller is over the limit, otherwise null.
 *
 *   const limited = await enforceRateLimit(req, { bucket: "forth-create-draft",
 *     identifier: gate.userId ?? "service", maxRequests: 30, windowSeconds: 60 });
 *   if (limited) return limited;
 */
export async function enforceRateLimit(
  req: Request,
  opts: RateLimitOptions,
): Promise<Response | null> {
  const admin =
    opts.admin ??
    createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { data, error } = await admin.rpc("check_rate_limit", {
      _bucket: opts.bucket,
      _identifier: opts.identifier,
      _max_requests: opts.maxRequests,
      _window_seconds: opts.windowSeconds,
    });
    if (error) {
      // Fail open, but make the limiter failure visible.
      console.error(`rateLimit: check_rate_limit RPC error for ${opts.bucket}: ${error.message}`);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row && row.allowed === false) {
      return tooManyRequests(req, row.retry_after_seconds ?? opts.windowSeconds);
    }
    return null;
  } catch (e) {
    console.error(`rateLimit: unexpected error for ${opts.bucket}: ${String(e)}`);
    return null;
  }
}
