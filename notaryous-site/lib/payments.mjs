/**
 * Zoho Payments session shapes.
 *
 * Split from the request helpers for the same reason as `zoho-bookings.mjs`:
 * the requests cannot be tested from the build environment, the parsing can,
 * and the parsing is where a mistake costs money rather than a retry.
 *
 * The governing rule here is **default deny**. `sessionPayment()` decides
 * whether an appointment gets created, and the orchestration service has no
 * second gate — the Zoho Flow sends a hardcoded payment reference, so anything
 * that reaches it is treated as paid. A status string we do not recognise must
 * therefore read as "not paid", never as "probably fine".
 */

/** Statuses that mean the money is actually ours. Nothing else counts. */
const PAID = new Set(['succeeded', 'success', 'paid', 'captured', 'completed']);

/** Statuses seen that explicitly mean "not paid" — distinguished from unknown. */
const NOT_PAID = new Set(['pending', 'initiated', 'created', 'failed', 'canceled',
  'cancelled', 'expired', 'requires_payment_method', 'processing']);

/** Peel the session object out of whichever envelope Zoho used. */
export function unwrapSession(json) {
  if (!json || typeof json !== 'object') return null;
  return json.payments_session ?? json.payment_session ?? json.data ?? json;
}

/**
 * Zoho Payments' documented `meta_data` limits.
 *
 * Learned the hard way: the first live checkout sent nine entries and Zoho
 * answered `400 {"code":"error","message":"meta_data varies from the defined
 * limit"}`. The docs put the cap at five, keys at 20 characters and values at
 * 500 — and say plainly that personally identifiable information does not
 * belong in meta_data at all.
 *
 * Which is why exactly one entry travels now: `hold_id`. Everything else about
 * the booking lives on the slot_holds row it points at.
 */
export const META_LIMITS = { entries: 5, keyLength: 20, valueLength: 500 };

/**
 * Booking context → the `meta_data` array Zoho round-trips for us.
 *
 * The `{key, value}` element shape is CONFIRMED against a live checkout
 * (2026-08-09) — it was inferred until then.
 *
 * Throws rather than truncating. A silently dropped entry would present as a
 * `context_lost` after the customer has paid, which is the worst possible place
 * to discover it — whereas a throw here fails a test, or at worst fails a
 * checkout before any money moves.
 *
 * @param {Record<string, string|number|boolean|null|undefined>} context
 * @returns {{key: string, value: string}[]} entries with no value are dropped
 */
export function buildMetaData(context) {
  const entries = Object.entries(context || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([key, value]) => ({ key, value: String(value) }));

  if (entries.length > META_LIMITS.entries) {
    throw new Error(
      `meta_data has ${entries.length} entries, Zoho allows ${META_LIMITS.entries}: `
      + `${entries.map((e) => e.key).join(', ')}. Put the value on the slot_holds row instead.`,
    );
  }
  for (const { key, value } of entries) {
    if (key.length > META_LIMITS.keyLength) {
      throw new Error(`meta_data key "${key}" is ${key.length} chars, Zoho allows ${META_LIMITS.keyLength}`);
    }
    if (value.length > META_LIMITS.valueLength) {
      throw new Error(`meta_data value for "${key}" is ${value.length} chars, Zoho allows ${META_LIMITS.valueLength}`);
    }
  }
  return entries;
}

/**
 * Read `meta_data` back, tolerating both shapes it could arrive in.
 *
 * Zoho documents an array; whether the elements are `{key, value}` or
 * `{name, value}` is not confirmed against a live response, so both are
 * accepted, as is a plain object if Zoho ever flattens it.
 */
export function parseMetaData(sessionOrJson) {
  const s = unwrapSession(sessionOrJson);
  const raw = s?.meta_data ?? s?.metadata ?? null;
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const out = {};
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue;
      const key = entry.key ?? entry.name ?? entry.label;
      if (key == null || key === '') continue;
      out[String(key)] = entry.value == null ? '' : String(entry.value);
    }
    return out;
  }
  if (typeof raw === 'object') {
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v == null ? '' : String(v)]));
  }
  return {};
}

/**
 * Recover an id that `JSON.parse` may have silently rounded.
 *
 * Zoho ids exceed 2^53. A real one from the first live checkout:
 *
 *   payment_id 22684000000151089  →  as a JSON number  →  22684000000151090
 *
 * Off by one, no error, and `payment_id` is what a refund is issued against —
 * so a rounded id refunds nothing, or refunds the wrong charge. Zoho sent this
 * one as a string, but it sends 19-digit service ids as numbers elsewhere
 * (glg-ron-orchestration's config.js carries a note about exactly that), so the
 * shape is not something to rely on.
 *
 * When the parsed value is an unsafe integer, the digits are read back out of
 * the raw response text, which never lost them.
 *
 * @param {unknown} parsed the value JSON.parse produced
 * @param {string} raw     the unparsed response body
 * @param {string} key     the field name to look for
 * @returns {string|null}
 */
export function exactId(parsed, raw, key) {
  if (parsed == null) return null;
  if (typeof parsed !== 'number' || Number.isSafeInteger(parsed)) return String(parsed);

  const m = typeof raw === 'string'
    ? new RegExp(`"${key}"\\s*:\\s*(\\d+)`).exec(raw)
    : null;
  if (m) return m[1];

  // Nothing to recover it from. Say so — this value cannot be trusted for a
  // refund, and silence here is how the wrong person gets their money back.
  console.error(JSON.stringify({
    severity: 'ERROR',
    msg: `Zoho id "${key}" arrived as an unsafe JSON number and could not be recovered from the raw body`,
    rounded_value: String(parsed),
  }));
  return String(parsed);
}

/** Zoho returns epoch SECONDS. Treating them as milliseconds dates to 1970. */
const epochToIso = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
};

/**
 * What a retrieved session says about the money.
 *
 * @returns {{
 *   paid: boolean,
 *   status: string|null,
 *   known: boolean,        false when the status string is not one we recognise
 *   paymentId: string|null,
 *   createdAt: string|null,
 *   expiresAt: string|null,
 * }}
 */
export function sessionPayment(json, raw = null) {
  const s = unwrapSession(json);
  if (!s || typeof s !== 'object') {
    return { paid: false, status: null, known: false, paymentId: null, createdAt: null, expiresAt: null };
  }

  // The session's own status, or the status of a payment attached to it.
  const attempts = Array.isArray(s.payments) ? s.payments
    : Array.isArray(s.payment) ? s.payment
    : s.payment && typeof s.payment === 'object' ? [s.payment]
    : [];
  const successful = attempts.find((p) => PAID.has(String(p?.status || '').toLowerCase()));

  const status = String(successful?.status ?? s.status ?? s.payment_status ?? '').toLowerCase() || null;
  const paid = status != null && PAID.has(status);
  const known = status != null && (PAID.has(status) || NOT_PAID.has(status));

  const rawId = successful?.payment_id ?? successful?.id
    ?? s.payment_id ?? s.payments_session_payment_id ?? null;
  // Zoho ids exceed 2^53; recover the exact digits if JSON.parse rounded them.
  const paymentId = exactId(rawId, raw, successful?.payment_id != null || s.payment_id != null ? 'payment_id' : 'id');

  return {
    paid,
    status,
    known,
    paymentId,
    createdAt: epochToIso(s.created_time ?? s.created_at),
    expiresAt: epochToIso(s.expiry_time ?? s.expires_at),
  };
}

/** Session id out of a create response, wherever Zoho put it. */
export function sessionId(json, raw = null) {
  const s = unwrapSession(json);
  const key = s?.payments_session_id != null ? 'payments_session_id'
    : s?.payment_session_id != null ? 'payment_session_id' : 'id';
  const id = s?.payments_session_id ?? s?.payment_session_id ?? s?.id ?? null;
  return exactId(id, raw, key);
}

/**
 * Session lifetime in seconds, from the create response.
 *
 * Measured on a live response as exactly 900 (created_time 1786227520,
 * expiry_time 1786228420). `db/002_slot_holds.sql` holds a slot for 17 minutes
 * against it; if this ever returns materially more than 900 the hold TTL is
 * too short and the slot can be re-sold under a customer who can still pay.
 */
export function sessionLifetimeSeconds(json) {
  const s = unwrapSession(json);
  const created = Number(s?.created_time);
  const expiry = Number(s?.expiry_time);
  if (!Number.isFinite(created) || !Number.isFinite(expiry) || expiry <= created) return null;
  return expiry - created;
}
