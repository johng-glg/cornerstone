/**
 * Zoho auth and request helpers.
 *
 * Written for the /step0 diagnostic but deliberately general — the token cache
 * and the request shapes are what /api/availability, /api/checkout and the
 * payment confirmation handler will use, so step 0 exercises the same code path
 * the real build depends on rather than a throwaway.
 *
 * Every host and path is an environment variable with a documented default.
 * The point of step 0 is that we do not yet know these are right; a wrong guess
 * should be one env var away from fixed, not a redeploy.
 */

const env = (k, fallback) => process.env[k] ?? fallback;

export const CONFIG = {
  accountsHost: () => env('ZOHO_ACCOUNTS_HOST', 'https://accounts.zoho.com'),
  // ZOHO_API_DOMAIN is whatever the token exchange returned. Zoho is
  // multi-region and hands you your data centre's host in the token response;
  // hardcoding one silently breaks for an EU or IN org. ZOHO_API_HOST stays as
  // a manual override, and the literal is only a last resort.
  bookingsHost: () => env('ZOHO_API_DOMAIN', env('ZOHO_API_HOST', 'https://www.zohoapis.com')),
  bookingsBase: () => env('ZOHO_BOOKINGS_BASE', '/bookings/v1/json'),
  paymentsHost: () => env('ZOHO_PAYMENTS_HOST', 'https://payments.zoho.com'),
  serviceId: () => env('ZOHO_SERVICE_ID'),
  staffId: () => env('ZOHO_STAFF_ID'),
  paymentsAccountId: () => env('ZOHO_PAYMENTS_ACCOUNT_ID'),
  orgTimezone: () => env('ZOHO_ORG_TIMEZONE', 'America/Los_Angeles'),
};

/** Env vars each check needs, so the UI can say what is missing instead of 500ing. */
export const REQUIRED = {
  bookings: ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_SERVICE_ID', 'ZOHO_STAFF_ID'],
  payments: ['ZOHO_PAYMENTS_CLIENT_ID', 'ZOHO_PAYMENTS_CLIENT_SECRET', 'ZOHO_PAYMENTS_REFRESH_TOKEN', 'ZOHO_PAYMENTS_ACCOUNT_ID'],
};

export function missingEnv(names) {
  return names.filter((n) => !process.env[n]);
}

/**
 * Access token cache.
 *
 * Tokens last an hour. Module scope survives between invocations on a warm
 * lambda, so this refreshes on expiry rather than on every call — the spec is
 * explicit about not burning a refresh per request. `skew` retires the token a
 * minute early so a request never starts with 59:59 on the clock.
 */
const tokens = new Map();

async function refreshToken(kind) {
  const prefix = kind === 'payments' ? 'ZOHO_PAYMENTS_' : 'ZOHO_';
  const body = new URLSearchParams({
    refresh_token: process.env[`${prefix}REFRESH_TOKEN`],
    client_id: process.env[`${prefix}CLIENT_ID`],
    client_secret: process.env[`${prefix}CLIENT_SECRET`],
    grant_type: 'refresh_token',
  });
  const res = await fetch(`${CONFIG.accountsHost()}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`token refresh: non-JSON response (${res.status}): ${text.slice(0, 300)}`); }
  if (!res.ok || !json.access_token) {
    throw new Error(`token refresh failed (${res.status}): ${JSON.stringify(json).slice(0, 400)}`);
  }
  const skew = 60_000;
  const entry = { token: json.access_token, expiresAt: Date.now() + (Number(json.expires_in || 3600) * 1000) - skew };
  tokens.set(kind, entry);
  return entry.token;
}

export async function accessToken(kind = 'bookings', { force = false } = {}) {
  const cached = tokens.get(kind);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.token;
  return refreshToken(kind);
}

/** Fetch + one retry on 401, which is the documented "token died early" case. */
async function callWithAuth(kind, url, init) {
  let token = await accessToken(kind);
  const send = (t) => fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Zoho-oauthtoken ${t}` },
  });
  let res = await send(token);
  if (res.status === 401) {
    token = await accessToken(kind, { force: true });
    res = await send(token);
  }
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
  return { ok: res.ok, status: res.status, json, raw: text, url };
}

const bookingsUrl = (path, params) => {
  const u = new URL(CONFIG.bookingsHost() + CONFIG.bookingsBase() + path);
  for (const [k, v] of Object.entries(params || {})) if (v != null) u.searchParams.set(k, v);
  return u.toString();
};

export function bookingsGet(path, params) {
  return callWithAuth('bookings', bookingsUrl(path, params), { method: 'GET' });
}

/** Bookings write endpoints take multipart/form-data, not JSON. */
export function bookingsPostForm(path, fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v == null) continue;
    fd.append(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  return callWithAuth('bookings', bookingsUrl(path), { method: 'POST', body: fd });
}

export function paymentsPost(path, body) {
  const u = new URL(CONFIG.paymentsHost() + '/api/v1' + path);
  if (CONFIG.paymentsAccountId()) u.searchParams.set('account_id', CONFIG.paymentsAccountId());
  return callWithAuth('payments', u.toString(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function paymentsGet(path) {
  const u = new URL(CONFIG.paymentsHost() + '/api/v1' + path);
  if (CONFIG.paymentsAccountId()) u.searchParams.set('account_id', CONFIG.paymentsAccountId());
  return callWithAuth('payments', u.toString(), { method: 'GET' });
}

/**
 * Constant-time-ish comparison for the step 0 gate. Not a password store, but
 * a plain === leaks length and prefix through timing, and this route can create
 * real appointments on a real notary's calendar.
 */
export function tokenMatches(supplied, expected) {
  if (typeof supplied !== 'string' || typeof expected !== 'string') return false;
  if (supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < supplied.length; i++) diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** Anything that could carry a secret is stripped before a response is rendered. */
export function redact(value, { allow = [] } = {}) {
  const SECRET = /(access_token|refresh_token|client_secret|api_key|signing_key|authorization)/i;
  const allowed = new Set(allow.map((a) => a.toLowerCase()));
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        const hide = SECRET.test(k) && !allowed.has(k.toLowerCase());
        out[k] = hide ? '«redacted»' : walk(val);
      }
      return out;
    }
    return v;
  };
  return walk(value);
}
