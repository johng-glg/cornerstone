/**
 * Supabase access over PostgREST, with no dependencies.
 *
 * TARGET: the glg-ron project (ref xatqfliscgqswiohzkps) — the same database
 * glg-ron-orchestration writes to. `ron_sessions` is the single row per
 * booking, shared by both services; `slot_holds` is new and calendar-owned.
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must point there, not at a
 * calendar-specific project, or availability will subtract nothing and the two
 * services will disagree about what is booked.
 *
 * The whole API surface is zero-dependency by design — every route is a plain
 * `.mjs` file Vercel can run without a build step — and `@supabase/supabase-js`
 * would be the first thing to break that for the sake of three HTTP calls.
 * (The orchestration service does use the client library; it has a build step.)
 *
 * SUPABASE_SERVICE_ROLE_KEY bypasses RLS, which is exactly why both tables have
 * RLS on with no policies: the anon key reads nothing, and this key never
 * leaves the server.
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
 * Slots already sold, read from `ron_sessions` — the live table that
 * glg-ron-orchestration owns. There is no separate `bookings` table: one row
 * per booking, shared by both services.
 *
 * A hold expires; a sold slot does not, so rows come back shaped like holds
 * with a far-future expiry standing in for "this is permanent", and go through
 * the same `subtractHolds`.
 *
 * `session_status <> 'cancelled'` rather than an allow-list: every other status
 * — including the ones BlueNotary invents that our event map never produces,
 * like `unsigned` and `failed` — means the Zoho appointment still exists and
 * the slot is not free. Erring toward "taken" costs one offered slot; erring
 * the other way double-books a notary.
 */
const FOREVER = '9999-12-31T00:00:00.000Z';

export async function bookedSlots(fromISO, toISO) {
  const q = new URLSearchParams({
    select: 'scheduled_at,zoho_staff_id',
    scheduled_at: `gte.${fromISO}`,
    session_status: 'neq.cancelled',
  });
  q.append('scheduled_at', `lte.${toISO}`);
  const rows = await sbFetch(`/ron_sessions?${q}`);
  return (rows || [])
    // Rows predating the calendar have no zoho_staff_id and cannot name a
    // notary to block. That is safe rather than a hole: those appointments
    // were made through Zoho, so Zoho's own availability already excludes
    // them. This subtraction only exists to close the race between our Book
    // Appointment call and Zoho reflecting it.
    .filter((r) => r.zoho_staff_id)
    .map((r) => ({
      slot_start_utc: r.scheduled_at,
      staff_id: r.zoho_staff_id,
      expires_at: FOREVER,
    }));
}

export { sbFetch };
