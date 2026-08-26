/**
 * Parsing Zoho Bookings responses.
 *
 * Split out from the request helpers because the request half cannot be tested
 * from here — Zoho is unreachable from the build environment — while the
 * parsing half is where the real risk lives. Zoho wraps payloads inconsistently
 * (`response.returnvalue.data`, `response.returnvalue`, bare `data`, sometimes a
 * bare array) and its availability endpoint has been documented returning both
 * `"09:00"` and `"9:00 AM"` for the same field across versions.
 *
 * None of these shapes is confirmed against the live account yet, so every
 * parser here accepts all of them rather than betting on one. A wrong bet would
 * present as an empty calendar with a 200 response, which is the worst failure
 * this system can have: it looks like "no availability" and nobody investigates.
 * Hence `parseStaffIds` and `parseSlotInstants` return what they understood and
 * the callers treat "understood nothing" as an error, never as "none".
 */

import { wallClockToUTC, assertTimeZone } from './zoho-datetime.mjs';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Peel Zoho's wrappers off and return whatever array is inside. */
export function unwrap(json) {
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== 'object') return [];
  const rv = json.response?.returnvalue ?? json.returnvalue ?? json;
  if (Array.isArray(rv)) return rv;
  if (rv && typeof rv === 'object') {
    for (const key of ['data', 'response', 'slots', 'staffs', 'staff']) {
      if (Array.isArray(rv[key])) return rv[key];
    }
  }
  if (Array.isArray(json.data)) return json.data;
  return [];
}

/**
 * Staff ids for a service.
 *
 * @returns {string[]} deduped, order preserved — Zoho's order is the account's
 *   own staff order, which is as good a default rotation as any.
 */
export function parseStaffIds(json) {
  const out = [];
  for (const item of unwrap(json)) {
    const id = typeof item === 'string' || typeof item === 'number'
      ? String(item)
      : item && (item.id ?? item.staff_id ?? item.staffId ?? item.resource_id);
    if (id == null || id === '') continue;
    const s = String(id);
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

/** `2026-09-01` → `{year, month, day}`. Returns null on anything else. */
export function parseISODate(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/**
 * A time-of-day in any of the forms Zoho has been seen to emit.
 * `09:00`, `09:00:00`, `9:00 AM`, `9:00am`, `9 AM`.
 * @returns {{hour:number, minute:number, second:number}|null}
 */
export function parseTimeOfDay(text) {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*([AaPp][Mm])?\s*$/.exec(String(text ?? ''));
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  const second = Number(m[3] ?? 0);
  const mer = m[4] ? m[4].toLowerCase() : null;
  if (mer) {
    if (hour < 1 || hour > 12) return null;
    if (mer === 'pm' && hour !== 12) hour += 12;
    if (mer === 'am' && hour === 12) hour = 0;
  } else if (hour > 23) return null;
  if (minute > 59 || second > 59) return null;
  return { hour, minute, second };
}

/** `01-Sep-2026 09:00:00` — the format Zoho takes on the way in, and sometimes gives back. */
function parseZohoStamp(text) {
  const m = /^(\d{2})-([A-Za-z]{3})-(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(text ?? '').trim());
  if (!m) return null;
  const monthIndex = MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
  if (monthIndex < 0) return null;
  return {
    year: Number(m[3]), month: monthIndex + 1, day: Number(m[1]),
    hour: Number(m[4]), minute: Number(m[5]), second: Number(m[6] ?? 0),
  };
}

/**
 * An availability response → UTC ISO instants.
 *
 * Zoho answers per staff member, per date, in the *staff's* zone, and the
 * entries may be bare times ("09:00"), local stamps ("01-Sep-2026 09:00:00") or
 * — if it ever starts sending them — full ISO instants. Times and local stamps
 * are resolved against `timeZone`; an instant with its own offset is taken as
 * given, because reinterpreting an unambiguous moment in another zone is how
 * you move an appointment by seven hours.
 *
 * @param {*} json
 * @param {{date: string, timeZone: string}} ctx `date` is `YYYY-MM-DD` in `timeZone`
 * @returns {{instants: string[], unparsed: string[]}}
 *   `unparsed` is deliberately returned rather than logged and swallowed: a
 *   caller that gets zero instants and a non-empty `unparsed` knows the format
 *   changed, which is a very different thing from a day with nothing free.
 */
export function parseSlotInstants(json, { date, timeZone }) {
  assertTimeZone(timeZone);
  const day = parseISODate(date);
  if (!day) throw new TypeError(`zoho-bookings: date must be YYYY-MM-DD, got ${JSON.stringify(date)}`);

  const instants = [];
  const unparsed = [];
  for (const item of unwrap(json)) {
    const raw = typeof item === 'string' || typeof item === 'number'
      ? String(item)
      : item && (item.time ?? item.start_time ?? item.from_time ?? item.slot ?? item.start);
    if (raw == null || raw === '') continue;
    const text = String(raw).trim();

    // A full ISO instant carries its own offset; trust it and stop.
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(text)) {
      const explicitOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(text);
      const t = Date.parse(text.replace(' ', 'T'));
      if (Number.isNaN(t)) { unparsed.push(text); continue; }
      if (explicitOffset) { push(instants, new Date(t).toISOString()); continue; }
      // No offset means it is local wall clock that happens to be ISO-shaped.
      const [d, tm] = text.replace('T', ' ').split(' ');
      const dd = parseISODate(d);
      const tod = parseTimeOfDay(tm);
      if (!dd || !tod) { unparsed.push(text); continue; }
      pushWall(instants, unparsed, { ...dd, ...tod }, timeZone, text);
      continue;
    }

    const stamp = parseZohoStamp(text);
    if (stamp) { pushWall(instants, unparsed, stamp, timeZone, text); continue; }

    const tod = parseTimeOfDay(text);
    if (tod) { pushWall(instants, unparsed, { ...day, ...tod }, timeZone, text); continue; }

    unparsed.push(text);
  }
  instants.sort();
  return { instants, unparsed };
}

function push(list, iso) { if (!list.includes(iso)) list.push(iso); }

function pushWall(list, unparsed, wall, timeZone, original) {
  try {
    push(list, wallClockToUTC(wall, timeZone).toISOString());
  } catch {
    // wallClockToUTC throws on the DST spring-forward gap. A slot at a time
    // that does not exist cannot be booked, so it is dropped — but it is
    // recorded, because Zoho offering one means something upstream is wrong.
    unparsed.push(original);
  }
}

/**
 * Booking id out of a create/update response, wherever Zoho put it this time.
 * Shared by step 0 and the checkout confirmation so they cannot disagree.
 */
/**
 * A phone number in the only shape Zoho Bookings accepts: digits, nothing else.
 *
 * VERIFIED AGAINST LIVE DATA, 2026-08-24. Nineteen of nineteen successful
 * bookings carried digits-only phone numbers, in both 10-digit (4434402092)
 * and 11-digit (12539939175) form. Three of the four failures carried a
 * bracket, a space or a hyphen — "(615) 946-6334", "(773) 405-0597",
 * "540-539-8438" — and Zoho rejected each with "invalid phone_number".
 *
 * Those three customers were charged $25 and got no appointment. This is that
 * bug, and it is one line: the front end accepts a phone the way a person
 * writes it, and nothing normalised it before it reached Zoho.
 *
 * Applied at the Zoho boundary only. slot_holds keeps whatever the customer
 * typed, because that is the version someone reads back on the telephone.
 */
export function zohoPhone(raw) {
  return String(raw ?? '').replace(/\D/g, '');
}

/**
 * The failure Zoho hides inside a success.
 *
 * Book Appointment answered HTTP **200** with `response.status: "success"` and
 * the real outcome two levels down:
 *
 *   {"response":{"returnvalue":{"status":"failure","message":"invalid phone_number"},
 *                "status":"success"}}
 *
 * Nothing at the HTTP layer or the top of the envelope says anything is wrong.
 * The route survived this only because it also requires a booking id, so the
 * absence of one caught it — but "no id" and "Zoho told us exactly what was
 * wrong" are different things, and only the second is actionable.
 *
 * @returns {string|null} the failure message, or null if this is not a failure
 */
export function parseBookingFailure(json) {
  const rv = json?.response?.returnvalue ?? json?.data ?? json ?? null;
  if (!rv || typeof rv !== 'object') return null;
  const status = String(rv.status ?? '').toLowerCase();
  if (status !== 'failure' && status !== 'fail' && status !== 'error') return null;
  return String(rv.message ?? rv.response_message ?? 'Zoho reported a failure with no message');
}

export function parseBookingId(json) {
  const rv = json?.response?.returnvalue ?? json?.data ?? json ?? null;
  if (!rv || typeof rv !== 'object') return null;
  const direct = rv.booking_id ?? rv.bookingId ?? rv.booking_ids?.[0] ?? null;
  if (direct) return String(direct);
  const nested = Array.isArray(rv.data) ? rv.data[0] : rv.data;
  if (nested && typeof nested === 'object') {
    const id = nested.booking_id ?? nested.bookingId ?? nested.booking_ids?.[0];
    if (id) return String(id);
  }
  return null;
}
