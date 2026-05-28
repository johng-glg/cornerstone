/**
 * Shared Forth OAuth + HTTP helper.
 *
 * Cornerstone Phase 2A: single source of getAccessToken (was duplicated across 8 forth-* fns).
 * Cornerstone Phase 2B: per-company credential lookup via company_processor_configs.config
 *                       JSONB (plaintext for now — encryption deferred, see deferred-cornerstone-items).
 *                       Falls back to FORTH_CLIENT_ID / FORTH_API_KEY env secrets.
 *
 * Token cache is keyed by companyId (or 'default' for env-fallback) and lives in module memory.
 * Cold starts drop the cache; Forth tokens are valid ~10 days so we cache for 9 days.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000; // 9 days
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh if <5min left

interface CachedToken {
  token: string;
  expiresAt: number;
}
const tokenCache = new Map<string, CachedToken>();

function normalize(s: string): string {
  return s.replace(/[\r\n\s]+/g, '');
}

interface ForthCreds {
  clientId: string;
  clientSecret: string;
  source: 'tenant' | 'env';
}

async function resolveCreds(companyId?: string): Promise<ForthCreds> {
  // Try per-tenant config first (Phase 2B)
  if (companyId) {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data } = await supabase
        .from('company_processor_configs')
        .select('config, api_key_encrypted')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      // config JSONB shape: { client_id: string, api_key: string }
      // Plaintext for now; encryption deferred to a later Cornerstone pass.
      const cfg = (data?.config ?? {}) as { client_id?: string; api_key?: string };
      if (cfg.client_id && cfg.api_key) {
        return { clientId: cfg.client_id, clientSecret: cfg.api_key, source: 'tenant' };
      }
    } catch (e) {
      console.warn('[forthAuth] tenant cred lookup failed, falling back to env:', e);
    }
  }

  const clientId = Deno.env.get('FORTH_CLIENT_ID');
  const clientSecret = Deno.env.get('FORTH_API_KEY');
  if (!clientId || !clientSecret) {
    throw new Error('Missing FORTH_CLIENT_ID or FORTH_API_KEY secrets');
  }
  return { clientId, clientSecret, source: 'env' };
}

/**
 * Get a Forth OAuth access token, cached per company (or 'default' for env fallback).
 *
 * @param companyId Optional company UUID. When supplied, looks up per-tenant creds in
 *                  company_processor_configs; falls back to env secrets if absent.
 */
export async function getAccessToken(companyId?: string): Promise<string> {
  const cacheKey = companyId ?? 'default';
  const now = Date.now();
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > now + REFRESH_BUFFER_MS) {
    return cached.token;
  }

  const { clientId, clientSecret, source } = await resolveCreds(companyId);
  console.log(`[forthAuth] fetching new token (cacheKey=${cacheKey}, source=${source})`);

  const resp = await fetch('https://api.forthcrm.com/v1/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: normalize(clientSecret),
    }),
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error('[forthAuth] OAuth failed:', resp.status, text);
    throw new Error(`OAuth failed: ${resp.status} - ${text}`);
  }

  let data: any;
  try { data = JSON.parse(text); } catch {
    throw new Error(`Failed to parse OAuth response: ${text}`);
  }

  // Defensive: Forth's response shape has varied; check several locations.
  const token =
    data.response?.access_token ||
    data.response?.api_key ||
    data.access_token ||
    data.api_key ||
    data.data?.access_token ||
    data.token;

  if (!token) {
    console.error('[forthAuth] no token in response. keys:', Object.keys(data).join(','));
    throw new Error('No access_token in OAuth response');
  }

  tokenCache.set(cacheKey, { token, expiresAt: now + TOKEN_TTL_MS });
  return token;
}

export function buildForthHeaders(accessToken: string): Record<string, string> {
  return {
    'Api-Key': accessToken,
    'Content-Type': 'application/json',
  };
}

/** Clear cached token(s). Pass companyId to clear one entry, or no args to clear all. */
export function clearTokenCache(companyId?: string): void {
  if (companyId) tokenCache.delete(companyId);
  else tokenCache.clear();
}

/**
 * Cornerstone Phase 2E — Forth HTTP wrapper with 429/Retry-After backoff.
 * Retries up to 3 times: 1s, 4s, 16s (or honors Retry-After when present).
 *
 * Use in place of `fetch()` for any Forth API call. Non-429 errors pass through
 * unchanged — caller is responsible for response handling.
 */
const BACKOFF_MS = [1000, 4000, 16000];

export interface ForthFetchOptions {
  /** Forth function name (e.g. 'forth-poll-transactions') — used in retry logs. */
  caller?: string;
  /** Optional company UUID — written to plsa_sync_log on retry. */
  companyId?: string;
}

export async function forthFetch(
  url: string,
  init: RequestInit,
  opts: ForthFetchOptions = {},
): Promise<Response> {
  let lastResp: Response | undefined;
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    const resp = await fetch(url, init);
    if (resp.status !== 429) return resp;

    lastResp = resp;
    if (attempt === BACKOFF_MS.length) break; // out of retries

    const retryAfter = resp.headers.get('Retry-After');
    const waitMs = retryAfter
      ? (isNaN(Number(retryAfter)) ? BACKOFF_MS[attempt] : Number(retryAfter) * 1000)
      : BACKOFF_MS[attempt];

    console.warn(`[forthFetch] 429 from ${url} (attempt ${attempt + 1}); waiting ${waitMs}ms`);
    void logRetry(opts.caller, opts.companyId, url, attempt + 1, waitMs);
    await new Promise(r => setTimeout(r, waitMs));
  }
  return lastResp!;
}

async function logRetry(
  caller: string | undefined,
  companyId: string | undefined,
  url: string,
  attempt: number,
  waitMs: number,
): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    await supabase.from('plsa_sync_log').insert({
      entity_type: 'forth_api',
      action: 'retry',
      success: false,
      request_payload: { caller, url, attempt, wait_ms: waitMs, company_id: companyId ?? null },
    });
  } catch (e) {
    console.warn('[forthFetch] retry log insert failed:', e);
  }
}

