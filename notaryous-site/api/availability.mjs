/**
 * GET /api/availability?from=<ISO>&to=<ISO>[&staff_id=<id>]
 *
 * Combined availability across every notary on the service.
 *
 * `staff_id` is optional and is a filter, not a requirement. Without it the
 * route asks Zoho for each staff member's diary, unions the times, and tags
 * each one with who is actually free then. The front end renders the times; the
 * tagging is what lets /api/checkout pick a notary at booking time instead of
 * the service depending on one hardcoded person.
 *
 * Response:
 *   { slots: ISO[], staff: { [ISO]: staffId[] }, staff_count, window, source }
 *
 * `slots` stays a flat array of ISO strings so an older client keeps working;
 * `staff` is additive.
 */

import { CONFIG, REQUIRED, missingEnv, resolveStaffIds, fetchStaffAvailability } from './_zoho.mjs';
import { dbConfigured, liveHolds, bookedSlots } from './_db.mjs';
import { mergeStaffAvailability, subtractHolds, toResponse } from '../lib/availability.mjs';
import { isoDateInZone } from '../lib/zoho-datetime.mjs';

const MAX_DAYS = 31;
const DEFAULT_DAYS = 14;

/** Minutes of lead time. A slot inside the hold window cannot survive checkout. */
const minNotice = () => Number(process.env.BOOKING_MIN_NOTICE_MINUTES ?? 60);

/**
 * Zoho answers per staff, per day, so a fortnight with three notaries is 42
 * requests. Unbounded that is a burst Zoho will rate-limit and a lambda that
 * runs out of sockets; serialised it is 42 round trips in a row. Six at a time
 * keeps the wall clock reasonable without looking like an attack.
 */
const CONCURRENCY = Number(process.env.ZOHO_FETCH_CONCURRENCY ?? 6);

async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return out;
}

/**
 * Short response cache.
 *
 * Availability is read on every page load and changes on the order of minutes.
 * Without this, one person refreshing the calendar is 42 Zoho calls a refresh.
 * The TTL is deliberately short and holds are subtracted AFTER the cache, so a
 * slot someone is paying for right now still disappears immediately — the cache
 * only ever holds Zoho's answer, never the availability we publish.
 */
const CACHE_TTL = Number(process.env.AVAILABILITY_CACHE_TTL_MS ?? 60_000);
const cache = new Map();

function cached(key, produce) {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const value = produce().catch((err) => { cache.delete(key); throw err; });
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
  if (cache.size > 64) for (const [k, v] of cache) if (v.expiresAt <= Date.now()) cache.delete(k);
  return value;
}

/**
 * Every calendar date the window touches, as one instant inside each.
 *
 * Stepped in twelve-hour hops rather than twenty-four so a DST shift cannot
 * skip a date: adding 24h across a spring-forward lands at 01:00 the next day,
 * which is still the next date, but adding it repeatedly drifts. Dates are
 * deduped by their key in the org zone, so the hop size only has to be small
 * enough never to jump a whole day.
 */
export function daysBetween(from, to, tz) {
  const days = [];
  const seen = new Set();
  for (let t = from.getTime(); t <= to.getTime(); t += 43200000) {
    const d = new Date(t);
    const key = isoDateInZone(d, tz);
    if (seen.has(key)) continue;
    seen.add(key);
    days.push(d);
  }
  const lastKey = isoDateInZone(to, tz);
  if (!seen.has(lastKey)) days.push(to);
  return days;
}

async function gather(staffIds, days, tz) {
  const jobs = [];
  for (const staffId of staffIds) for (const day of days) jobs.push({ staffId, day });
  const results = await pool(jobs, CONCURRENCY, ({ staffId, day }) => fetchStaffAvailability(staffId, day, tz));

  const perStaff = {};
  const unparsed = [];
  let failures = 0;
  results.forEach((r, i) => {
    const { staffId } = jobs[i];
    if (!r.ok) { failures++; return; }
    (perStaff[staffId] ||= []).push(...r.instants);
    if (r.unparsed.length) unparsed.push(...r.unparsed);
  });
  return { perStaff, unparsed, failures, attempted: jobs.length };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'method_not_allowed' }));
  }

  const miss = missingEnv(REQUIRED.bookings);
  if (miss.length) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: 'not_configured', missing: miss }));
  }

  const q = new URL(req.url, 'http://x').searchParams;
  const now = new Date();
  const from = new Date(Math.max(Date.parse(q.get('from')) || now.getTime(), now.getTime()));
  const requestedTo = Date.parse(q.get('to')) || (from.getTime() + DEFAULT_DAYS * 86400000);
  const to = new Date(Math.min(requestedTo, from.getTime() + MAX_DAYS * 86400000));
  if (!(to > from)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'bad_window', detail: '`to` must be after `from`.' }));
  }

  const tz = CONFIG.orgTimezone();

  try {
    const roster = await resolveStaffIds();
    if (!roster.staff.length) {
      // No roster is a configuration or upstream failure, not an empty diary.
      // Returning `slots: []` here would render as "fully booked for a
      // fortnight" and look like normal operation.
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'no_staff', detail: roster.error || 'No staff resolved for the service.' }));
    }

    const wanted = q.get('staff_id');
    const staffIds = wanted
      ? roster.staff.filter((s) => s === wanted)
      : roster.staff;
    if (!staffIds.length) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'unknown_staff', detail: `No staff "${wanted}" on this service.` }));
    }

    const days = daysBetween(from, to, tz);
    const key = `${CONFIG.serviceId()}|${tz}|${staffIds.join(',')}|${days.map((d) => isoDateInZone(d, tz)).join(',')}`;
    const { perStaff, unparsed, failures, attempted } = await cached(key, () => gather(staffIds, days, tz));

    // Every request failing is upstream being down. Publishing an empty
    // calendar in that case is the failure mode this route exists to avoid.
    if (failures === attempted) {
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'upstream', detail: 'Zoho returned an error for every availability request.' }));
    }
    // Nothing at all understood, but Zoho did answer: the response format moved.
    if (unparsed.length && !Object.values(perStaff).some((v) => v.length)) {
      res.statusCode = 502;
      return res.end(JSON.stringify({
        error: 'unreadable_availability',
        detail: 'Zoho answered, but no slot in the response could be parsed. The response format has changed.',
        sample: unparsed.slice(0, 5),
      }));
    }

    let slots = mergeStaffAvailability(perStaff);

    const floor = now.getTime() + minNotice() * 60_000;
    slots = slots.filter((s) => Date.parse(s.start) >= floor && Date.parse(s.start) <= to.getTime());

    let source = 'zoho';
    if (dbConfigured() && slots.length) {
      const [holds, sold] = await Promise.all([
        liveHolds(from.toISOString(), to.toISOString()),
        bookedSlots(from.toISOString(), to.toISOString()),
      ]);
      slots = subtractHolds(slots, [...(holds || []), ...sold], now);
    } else if (!dbConfigured()) {
      // Say so rather than implying holds were applied. Without the database a
      // slot can be offered to two people at once; that is a deploy-time
      // misconfiguration, and it should be visible in the response.
      source = 'zoho-no-holds';
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({
      ...toResponse(slots),
      window: { from: from.toISOString(), to: to.toISOString(), timezone: tz },
      source,
      ...(unparsed.length ? { unparsed_sample: unparsed.slice(0, 5) } : {}),
    }));
  } catch (err) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ error: 'availability_failed', detail: String(err?.message || err) }));
  }
}
