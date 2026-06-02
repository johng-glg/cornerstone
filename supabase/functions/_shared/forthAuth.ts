// Shared Forth OAuth + HTTP helper.
//
// Per-tenant credentials are read via the service-role-only RPC `decrypt_processor_credentials`
// (api_key stored encrypted in company_processor_configs.api_key_encrypted — Q-A4 divergence from
// Lovable's plaintext config). Falls back to FORTH_CLIENT_ID / FORTH_API_KEY env secrets.
//
// Access tokens are cached per company (or 'default') in module memory; Forth tokens last ~10 days
// so we cache for 9. Pure parsing/backoff helpers live in ./forth.ts (unit-tested).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  backoffWaitMs,
  extractAccessToken,
  normalizeSecret,
  type ForthTokenResponse,
} from "./forth.ts";

const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

interface CachedToken {
  token: string;
  expiresAt: number;
}
const tokenCache = new Map<string, CachedToken>();

interface ForthCreds {
  clientId: string;
  clientSecret: string;
  source: "tenant" | "env";
}

function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function resolveCreds(companyId?: string): Promise<ForthCreds> {
  if (companyId) {
    try {
      const supabase = serviceClient();
      const { data, error } = await supabase.rpc("decrypt_processor_credentials", {
        _company_id: companyId,
      });
      if (!error && data) {
        const creds = data as { client_id?: string; api_key?: string };
        if (creds.client_id && creds.api_key) {
          return { clientId: creds.client_id, clientSecret: creds.api_key, source: "tenant" };
        }
      }
    } catch (e) {
      console.warn("[forthAuth] tenant cred lookup failed, falling back to env:", e);
    }
  }

  const clientId = Deno.env.get("FORTH_CLIENT_ID");
  const clientSecret = Deno.env.get("FORTH_API_KEY");
  if (!clientId || !clientSecret) {
    throw new Error("Missing FORTH_CLIENT_ID or FORTH_API_KEY secrets");
  }
  return { clientId, clientSecret, source: "env" };
}

/** Get a Forth OAuth access token, cached per company (or 'default' for env fallback). */
export async function getAccessToken(companyId?: string): Promise<string> {
  const cacheKey = companyId ?? "default";
  const now = Date.now();
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > now + REFRESH_BUFFER_MS) {
    return cached.token;
  }

  const { clientId, clientSecret, source } = await resolveCreds(companyId);
  console.log(`[forthAuth] fetching new token (cacheKey=${cacheKey}, source=${source})`);

  const resp = await fetch("https://api.forthcrm.com/v1/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: normalizeSecret(clientId),
      client_secret: normalizeSecret(clientSecret),
    }),
  });
  const text = await resp.text();
  if (!resp.ok) {
    console.error("[forthAuth] OAuth failed:", resp.status, text);
    throw new Error(`OAuth failed: ${resp.status} - ${text}`);
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse OAuth response: ${text}`);
  }
  const token = extractAccessToken(data as ForthTokenResponse);
  if (!token) {
    throw new Error("No access_token in OAuth response");
  }
  tokenCache.set(cacheKey, { token, expiresAt: now + TOKEN_TTL_MS });
  return token;
}

export function buildForthHeaders(accessToken: string): Record<string, string> {
  return { "Api-Key": accessToken, "Content-Type": "application/json" };
}

/** Clear cached token(s). Pass companyId to clear one entry, or no args to clear all. */
export function clearTokenCache(companyId?: string): void {
  if (companyId) tokenCache.delete(companyId);
  else tokenCache.clear();
}

export interface ForthFetchOptions {
  caller?: string;
  companyId?: string;
}

/** Forth HTTP wrapper with 429/Retry-After backoff (1s/4s/16s). Retries logged to plsa_sync_log. */
export async function forthFetch(
  url: string,
  init: RequestInit,
  opts: ForthFetchOptions = {},
): Promise<Response> {
  let lastResp: Response | undefined;
  for (let attempt = 0; attempt <= 3; attempt++) {
    const resp = await fetch(url, init);
    if (resp.status !== 429) return resp;
    lastResp = resp;
    if (attempt === 3) break;
    const waitMs = backoffWaitMs(attempt, resp.headers.get("Retry-After"));
    console.warn(`[forthFetch] 429 from ${url} (attempt ${attempt + 1}); waiting ${waitMs}ms`);
    void logRetry(opts.caller, opts.companyId, url, attempt + 1, waitMs);
    await new Promise((r) => setTimeout(r, waitMs));
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
    const supabase = serviceClient();
    await supabase.from("plsa_sync_log").insert({
      entity_type: "forth_api",
      action: "retry",
      success: false,
      provider_id: "forth",
      request_payload: { caller, url, attempt, wait_ms: waitMs, company_id: companyId ?? null },
    });
  } catch (e) {
    console.warn("[forthFetch] retry log insert failed:", e);
  }
}
