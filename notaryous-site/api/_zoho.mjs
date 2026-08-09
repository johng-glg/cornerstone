/**
 * Zoho auth and request helpers.
 *
 * Written first for the (since deleted) /step0 diagnostic, deliberately general
 * so it would be the real thing rather than a throwaway — the token cache
 * and the request shapes are what /api/availability, /api/checkout and the
 * payment confirmation handler will use, so step 0 exercises the same code path
 * the real build depends on rather than a throwaway.
 *
 * Every host and path is an environment variable with a documented default.
 * The point of step 0 is that we do not yet know these are right; a wrong guess
 * should be one env var away from fixed, not a redeploy.
 */

import { parseStaffIds, parseSlotInstants } from '../lib/zoho-bookings.mjs';
import { zohoDate, isoDateInZone } from '../lib/zoho-datetime.mjs';

const env = (k, fallback) => process.env[k] ?? fallback;

export const CONFIG = {
  accountsHost: () => env('ZOHO_ACCOUNTS_HOST', 'https://accounts.zoho.com'),
  // ZOHO_API_DOMAIN is whatever the token exchange returned. Zoho is
  // multi-region and hands you your data centre's host in the token response;
  // hardcoding one silently breaks for an EU or IN org. ZOHO_API_HOST stays as
  // a manual override, and the literal is only a last resort.
  bookingsHost: () => env('ZOHO_API_DOMAIN', env('ZOHO_API_HOST', 'https://www.zohoapis.com')),
  bookingsBase: () => env('ZOHO_BOOKINGS_BASE', '/bookings/v1/json'),
  staffPath: () => env('ZOHO_STAFF_PATH', '/staffs'),
  availabilityPath: () => env('ZOHO_AVAILABILITY_PATH', '/availableslots'),
  paymentsHost: () => env('ZOHO_PAY_HOST', 'https://payments.zoho.com'),
  serviceId: () => env('ZOHO_SERVICE_ID'),
  // OPTIONAL, and step-0 only. See resolveStaffIds() below: production
  // discovers the service's staff and must not depend on one hardcoded notary.
  staffId: () => env('ZOHO_STAFF_ID'),
  paymentsAccountId: () => env('ZOHO_PAY_ACCOUNT_ID'),
  orgTimezone: () => env('ZOHO_ORG_TIMEZONE', 'America/Los_Angeles'),
};

/**
 * Env vars each check needs, so the UI can say what is missing instead of 500ing.
 *
 * ZOHO_STAFF_ID is deliberately NOT here. It was, and that made a single notary
 * a hard dependency of every booking path — the service would have gone down
 * the day that person left, and a second notary would have added no capacity.
 * It survives only as an override for pinning step 0 at a known staff record.
 */
export const REQUIRED = {
  bookings: ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_SERVICE_ID'],
  // Payments runs on the SAME Self Client as Bookings, so the client id and
  // secret are shared. Only the refresh token and the account id are
  // Payments-specific. An entry that is an array means "any one of these" —
  // the ZOHO_PAY_ names are honoured if someone later splits the clients, and
  // otherwise the Bookings credentials are used.
  payments: [
    ['ZOHO_PAY_CLIENT_ID', 'ZOHO_CLIENT_ID'],
    ['ZOHO_PAY_CLIENT_SECRET', 'ZOHO_CLIENT_SECRET'],
    'ZOHO_PAY_REFRESH_TOKEN',
    'ZOHO_PAY_ACCOUNT_ID',
  ],
};

/**
 * Which of `names` are unset. An entry may be an array of alternatives, which
 * counts as present when any one of them is set and is reported as
 * "A or B" so the UI names both.
 */
export function missingEnv(names) {
  return names
    .filter((n) => (Array.isArray(n) ? !n.some((k) => process.env[k]) : !process.env[n]))
    .map((n) => (Array.isArray(n) ? n.join(' or ') : n));
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

/**
 * The credentials a token refresh uses.
 *
 * Bookings and Payments run on the SAME Zoho Self Client, so the client id and
 * secret are identical and are not duplicated into ZOHO_PAY_* variables. The
 * refresh tokens differ, because the two products' scopes were granted by two
 * separate authorization codes.
 *
 * The ZOHO_PAY_CLIENT_ID / _SECRET names are still read first, so splitting the
 * two products onto separate clients later is a matter of setting two variables
 * rather than editing this file.
 */
export function credentialsFor(kind) {
  if (kind !== 'payments') {
    return {
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
    };
  }
  // If both are set and they DISAGREE, they are not the same Self Client, and
  // a refresh token issued by one will not authenticate against the other —
  // Zoho answers `invalid_client`, which reads like a bad secret rather than a
  // mismatched pair. Presence checks cannot catch this, so say it out loud.
  // Scopes attach to the refresh token, not to the client, so a client id and
  // secret "generated with the wrong scopes" is not itself a problem; two
  // DIFFERENT clients is.
  const pairMismatch = process.env.ZOHO_PAY_CLIENT_ID && process.env.ZOHO_CLIENT_ID
    && process.env.ZOHO_PAY_CLIENT_ID !== process.env.ZOHO_CLIENT_ID;
  if (pairMismatch) {
    console.error(JSON.stringify({
      severity: 'ERROR',
      msg: 'ZOHO_PAY_CLIENT_ID differs from ZOHO_CLIENT_ID — these must be the same Self Client, or the Payments refresh token will not authenticate',
    }));
  }
  return {
    refresh_token: process.env.ZOHO_PAY_REFRESH_TOKEN,
    client_id: process.env.ZOHO_PAY_CLIENT_ID ?? process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_PAY_CLIENT_SECRET ?? process.env.ZOHO_CLIENT_SECRET,
  };
}

async function refreshToken(kind) {
  const creds = credentialsFor(kind);
  // URLSearchParams stringifies undefined as the literal "undefined" and posts
  // it, which comes back as an opaque Zoho error. Name the missing variable.
  for (const [field, value] of Object.entries(creds)) {
    if (!value) throw new Error(`token refresh (${kind}): no ${field} configured`);
  }
  const body = new URLSearchParams({ ...creds, grant_type: 'refresh_token' });
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

/** Drop cached access tokens. A test seam, and a way to force a re-auth. */
export function clearTokenCache() { tokens.clear(); }

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

/**
 * Every staff id that can take this service.
 *
 * ZOHO_STAFF_ID, if set, wins — that is its whole remaining job, pinning step 0
 * to one known record. It accepts a comma-separated list so a diagnostic can
 * exercise the multi-staff path without touching the account.
 *
 * Otherwise the list comes from Zoho. It is cached for STAFF_TTL because a
 * fortnight of availability is one lookup plus one call per staff per day, and
 * the roster changes on the order of months. Cache misses are cheap; a stale
 * roster for five minutes is a notary who joined five minutes ago, which is not
 * a real failure mode. An empty roster is NEVER cached — that is the shape of a
 * transient failure, and caching it would blank the calendar for five minutes.
 *
 * @returns {Promise<{staff: string[], source: 'env'|'zoho', status?: number, raw?: unknown}>}
 */
const STAFF_TTL = 5 * 60_000;
let staffCache = null;

export async function resolveStaffIds({ force = false } = {}) {
  const pinned = CONFIG.staffId();
  if (pinned) {
    const staff = String(pinned).split(',').map((s) => s.trim()).filter(Boolean);
    if (staff.length) return { staff, source: 'env' };
  }
  const serviceId = CONFIG.serviceId();
  if (!serviceId) return { staff: [], source: 'zoho', error: 'ZOHO_SERVICE_ID is not set' };

  if (!force && staffCache && staffCache.serviceId === serviceId && staffCache.expiresAt > Date.now()) {
    return { staff: staffCache.staff, source: 'zoho', cached: true };
  }
  const res = await bookingsGet(CONFIG.staffPath(), { service_id: serviceId });
  const staff = parseStaffIds(res.json);
  if (!res.ok || !staff.length) {
    return {
      staff: [],
      source: 'zoho',
      status: res.status,
      error: res.ok
        ? 'Zoho returned no staff for this service. Check the service id, and that at least one staff record is assigned to it.'
        : `Fetch Staff returned HTTP ${res.status}.`,
      raw: res.json ?? res.raw,
    };
  }
  staffCache = { serviceId, staff, expiresAt: Date.now() + STAFF_TTL };
  return { staff, source: 'zoho' };
}

/** Test seam and a way to drop the roster cache after a staffing change. */
export function clearStaffCache() { staffCache = null; }

/**
 * One staff member's free times on one date, as UTC ISO instants.
 *
 * @param {string} staffId
 * @param {Date} dayInstant any instant inside the wanted day
 * @param {string} timeZone the zone the date and the returned times are read in
 */
export async function fetchStaffAvailability(staffId, dayInstant, timeZone) {
  const res = await bookingsGet(CONFIG.availabilityPath(), {
    service_id: CONFIG.serviceId(),
    staff_id: staffId,
    selected_date: zohoDate(dayInstant, timeZone),
  });
  if (!res.ok) {
    return { instants: [], unparsed: [], ok: false, status: res.status, raw: res.json ?? res.raw };
  }
  const { instants, unparsed } = parseSlotInstants(res.json, {
    date: isoDateInZone(dayInstant, timeZone),
    timeZone,
  });
  return { instants, unparsed, ok: true, status: res.status };
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
