/**
 * Supabase access over PostgREST, with no dependencies.
 *
 * The whole API surface is zero-dependency by design — every route is a plain
 * `.mjs` file Vercel can run without a build step — and `@supabase/supabase-js`
 * would be the first thing to break that for the sake of three HTTP calls.
 *
 * SUPABASE_SERVICE_ROLE_KEY bypasses RLS, which is exactly why `bookings` and
 * `slot_holds` have RLS on with no policies: the anon key reads nothing, and
 * this key never leaves the server.
 */

const url = () => process.env.SUPABASE_URL;
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Whether the database is wired up at all. Availability degrades without it. */
export const dbConfigured = () => Boolean(url() && key());

async function sbFetch(path, init = {}) {
  if (!dbConfigured()) throw new Error('supabase: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  const res = await fetch(`${url().replace(/\/$/, '')}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: key(),
      Authorization: `Bearer ${key()}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
  if (!res.ok) {
    const detail = json?.message || text.slice(0, 300);
    throw new Error(`supabase ${init.method || 'GET'} ${path} → ${res.status}: ${detail}`);
  }
  return json;
}

/**
 * Live holds overlapping a window.
 *
 * `expires_at=gt.now()` is evaluated by Postgres, not by this process — the
 * lambda's clock and the database's can differ by seconds, and expiry is the
 * only thing standing between two customers and the same appointment.
 *
 * Returns rows shaped for `subtractHolds`: `{slot_start_utc, staff_id, expires_at}`.
 */
export function liveHolds(fromISO, toISO) {
  const q = new URLSearchParams({
    select: 'slot_start_utc,staff_id,expires_at',
    slot_start_utc: `gte.${fromISO}`,
    expires_at: 'gt.now()',
  });
  q.append('slot_start_utc', `lte.${toISO}`);
  return sbFetch(`/slot_holds?${q}`);
}

/**
 * Slots already sold. A hold expires; a booking does not, and Zoho may not have
 * removed the slot from availability yet at the moment we ask. Rows are shaped
 * like holds so they can go through the same subtraction, with a far-future
 * expiry standing for "this is permanent".
 */
export async function bookedSlots(fromISO, toISO) {
  const q = new URLSearchParams({
    select: 'slot_start_utc,staff_id',
    slot_start_utc: `gte.${fromISO}`,
    status: 'in.(paid,booked)',
  });
  q.append('slot_start_utc', `lte.${toISO}`);
  const rows = await sbFetch(`/bookings?${q}`);
  return (rows || [])
    .filter((r) => r.staff_id)      // a pre-staff-column row cannot block a named notary
    .map((r) => ({ ...r, expires_at: '9999-12-31T00:00:00.000Z' }));
}

export { sbFetch };
