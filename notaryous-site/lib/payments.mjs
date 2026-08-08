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
 * Booking context → the `meta_data` array Zoho round-trips for us.
 *
 * This is why the confirmation handler needs no server-side state beyond the
 * hold: it reads the context back from Zoho, not from the browser. The browser
 * only ever supplies an opaque session id, so a tampered client cannot change
 * which slot, notary or signer the appointment is created for.
 *
 * @param {Record<string, string|number|boolean|null|undefined>} context
 * @returns {{key: string, value: string}[]} entries with no value are dropped
 */
export function buildMetaData(context) {
  return Object.entries(context || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([key, value]) => ({ key, value: String(value) }));
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
export function sessionPayment(json) {
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

  const paymentId = successful?.payment_id ?? successful?.id
    ?? s.payment_id ?? s.payments_session_payment_id ?? null;

  return {
    paid,
    status,
    known,
    paymentId: paymentId == null ? null : String(paymentId),
    createdAt: epochToIso(s.created_time ?? s.created_at),
    expiresAt: epochToIso(s.expiry_time ?? s.expires_at),
  };
}

/** Session id out of a create response, wherever Zoho put it. */
export function sessionId(json) {
  const s = unwrapSession(json);
  const id = s?.payments_session_id ?? s?.payment_session_id ?? s?.id ?? null;
  return id == null ? null : String(id);
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
