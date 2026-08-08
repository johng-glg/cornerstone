/**
 * Zoho Bookings date/time formatting.
 *
 * Book Appointment wants `from_time` as `dd-MMM-yyyy HH:mm:ss` with a
 * three-letter English month — e.g. `28-Jan-2026 11:00:00` — expressed as the
 * WALL-CLOCK time in the zone passed alongside it in the `timezone` field.
 *
 * Three ways this goes wrong, all of which this module exists to prevent:
 *
 *  1. Handing Zoho an ISO string. It is not ISO and will not be parsed as one.
 *  2. Formatting with the runtime's local zone. Vercel functions run in UTC and
 *     a developer's laptop does not, so `toLocaleString()` without an explicit
 *     `timeZone` books a different hour in production than in dev. Every
 *     function here takes the zone explicitly; none reads the ambient one.
 *  3. Formatting with the runtime's locale. `MMM` must be English. A server
 *     negotiated to another locale would emit e.g. `janv.` or `1月`. Every
 *     formatter here pins `en-US`.
 *
 * Everything is derived from a UTC instant, which is the only unambiguous way
 * to name a moment. See `zohoFromTime` for the fall-back-hour caveat.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `dd-MMM-yyyy HH:mm:ss` — exactly what Book Appointment accepts. */
export const ZOHO_DATETIME_RE = /^\d{2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4} \d{2}:\d{2}:\d{2}$/;

/** `dd-MMM-yyyy` — the date half, for availability queries. */
export const ZOHO_DATE_RE = /^\d{2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4}$/;

function partsInZone(instant, timeZone) {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`zoho-datetime: invalid instant: ${String(instant)}`);
  }
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: 'numeric', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      // h23, not hour12:false. hour12:false is specified to produce h24 in
      // some engines, which renders midnight as 24:00:00 — a different day to
      // Zoho, and a booking an hour and a day out from what the customer chose.
      hourCycle: 'h23',
    }).formatToParts(date);
  } catch (e) {
    throw new TypeError(`zoho-datetime: invalid IANA time zone: ${String(timeZone)}`);
  }
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    year: get('year'),
    monthIndex: Number(get('month')) - 1,
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/**
 * Format a UTC instant as Zoho's `from_time`, in the signer's zone.
 *
 * @param {Date|string|number} instant  UTC instant (ISO string, Date, or epoch ms)
 * @param {string} timeZone             IANA zone, e.g. 'America/Los_Angeles'
 * @returns {string}                    e.g. '28-Jan-2026 11:00:00'
 *
 * Caveat on the DST fall-back hour: 01:30 local occurs twice, so the string
 * alone is ambiguous. That is inherent to a wall-clock format and is why we
 * only ever derive it from a UTC instant and never round-trip through it.
 */
export function zohoFromTime(instant, timeZone) {
  const p = partsInZone(instant, timeZone);
  const out = `${p.day}-${MONTHS[p.monthIndex]}-${p.year} ${p.hour}:${p.minute}:${p.second}`;
  if (!ZOHO_DATETIME_RE.test(out)) {
    throw new Error(`zoho-datetime: produced a malformed value: ${out}`);
  }
  return out;
}

/**
 * Date half only, for `selected_date` on Fetch Availability.
 * @returns {string} e.g. '28-Jan-2026'
 */
export function zohoDate(instant, timeZone) {
  const p = partsInZone(instant, timeZone);
  const out = `${p.day}-${MONTHS[p.monthIndex]}-${p.year}`;
  if (!ZOHO_DATE_RE.test(out)) {
    throw new Error(`zoho-datetime: produced a malformed value: ${out}`);
  }
  return out;
}

/** `2026-01-28` in the given zone — for keying the availability cache. */
export function isoDateInZone(instant, timeZone) {
  const p = partsInZone(instant, timeZone);
  return `${p.year}-${String(p.monthIndex + 1).padStart(2, '0')}-${p.day}`;
}

/** Throws unless `tz` is an IANA zone the runtime recognises. */
export function assertTimeZone(tz) {
  if (typeof tz !== 'string' || tz.length === 0) {
    throw new TypeError('zoho-datetime: time zone is required');
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
  } catch {
    throw new TypeError(`zoho-datetime: unknown IANA time zone: ${tz}`);
  }
  return tz;
}

/**
 * Offset of `timeZone` at `instant`, in minutes east of UTC.
 * Used to turn a wall-clock slot from Zoho back into a UTC instant.
 */
export function zoneOffsetMinutes(instant, timeZone) {
  const p = partsInZone(instant, timeZone);
  const asUTC = Date.UTC(
    Number(p.year), p.monthIndex, Number(p.day),
    Number(p.hour), Number(p.minute), Number(p.second),
  );
  const actual = (instant instanceof Date ? instant : new Date(instant)).getTime();
  return Math.round((asUTC - actual) / 60000);
}

/**
 * Wall-clock time in a zone → UTC instant.
 *
 * Two passes: guess with the offset at the naive instant, then re-derive with
 * the offset actually in force at the candidate. One correction is enough for
 * every real zone; a DST transition only ever shifts the answer once.
 *
 * Then it checks its own work. On the spring-forward gap — a local time that
 * does not exist, e.g. 02:30 on a US spring-forward Sunday — no instant can
 * satisfy the request, and the two-pass result lands an hour off. Returning it
 * would book an appointment an hour from where the caller asked, silently.
 * So the round-trip is verified and a mismatch throws.
 *
 * A gap time appearing in a Zoho availability response means something is
 * wrong upstream; surfacing it is the point. On the fall-back overlap, where
 * the local time occurs twice, the earlier (pre-transition) instant is
 * returned — both are legitimate answers and the earlier one is conventional.
 *
 * @param {{year:number,month:number,day:number,hour:number,minute?:number,second?:number}} wall
 *        `month` is 1-based.
 */
export function wallClockToUTC(wall, timeZone) {
  assertTimeZone(timeZone);
  const { year, month, day, hour, minute = 0, second = 0 } = wall;
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = new Date(naive - zoneOffsetMinutes(new Date(naive), timeZone) * 60000);
  guess = new Date(naive - zoneOffsetMinutes(guess, timeZone) * 60000);

  const want = `${String(day).padStart(2, '0')}-${MONTHS[month - 1]}-${year} ` +
               `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:` +
               `${String(second).padStart(2, '0')}`;
  const got = zohoFromTime(guess, timeZone);
  if (got !== want) {
    throw new RangeError(
      `zoho-datetime: ${want} does not exist in ${timeZone} ` +
      `(nearest is ${got}). This is a DST spring-forward gap.`,
    );
  }
  return guess;
}
