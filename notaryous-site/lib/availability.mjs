/**
 * Combining availability across every notary on a service.
 *
 * The production path must not depend on one hardcoded notary. Zoho's Fetch
 * Availability answers per staff member, so this merges those answers into a
 * single list of times, each tagged with which staff are actually free then.
 *
 * The consequence that drives every function here: **a hold is against one
 * staff member, not against a time.** If Ada is held for 11:00 and Grace is
 * also free at 11:00, 11:00 is still bookable. Subtracting holds at the time
 * level would silently hide capacity — with three notaries it would throw away
 * two thirds of the diary — so holds are subtracted from a slot's staff list
 * and the slot only disappears when that list empties.
 */

/**
 * @typedef {{ start: string, staff: string[] }} Slot
 *   `start` is a UTC ISO instant. `staff` is every staff id free at it.
 */

/** ISO instants compare correctly as strings only when normalised to UTC ms. */
const ms = (iso) => new Date(iso).getTime();

/**
 * Merge per-staff availability into one list of slots.
 *
 * @param {Record<string, string[]>} perStaff  staff id → UTC ISO instants
 * @returns {Slot[]} sorted by time; `staff` sorted for a stable response
 */
export function mergeStaffAvailability(perStaff) {
  const byTime = new Map();
  for (const [staffId, instants] of Object.entries(perStaff || {})) {
    for (const iso of instants || []) {
      const t = ms(iso);
      if (Number.isNaN(t)) continue;              // a malformed instant is dropped, not booked
      if (!byTime.has(t)) byTime.set(t, new Set());
      byTime.get(t).add(String(staffId));
    }
  }
  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, set]) => ({ start: new Date(t).toISOString(), staff: [...set].sort() }));
}

/**
 * Remove held staff from each slot, dropping slots that end up with nobody.
 *
 * @param {Slot[]} slots
 * @param {{slot_start_utc: string, staff_id: string, expires_at?: string}[]} holds
 * @param {Date} [now] injectable for tests
 */
export function subtractHolds(slots, holds, now = new Date()) {
  const live = new Map();
  for (const h of holds || []) {
    // A hold with a past expiry is not a hold. The database filters these too,
    // but a stale read must not remove capacity.
    if (h.expires_at && ms(h.expires_at) <= now.getTime()) continue;
    const t = ms(h.slot_start_utc);
    if (Number.isNaN(t)) continue;
    if (!live.has(t)) live.set(t, new Set());
    live.get(t).add(String(h.staff_id));
  }
  const out = [];
  for (const slot of slots) {
    const held = live.get(ms(slot.start));
    const free = held ? slot.staff.filter((s) => !held.has(s)) : slot.staff;
    if (free.length) out.push({ ...slot, staff: free });
  }
  return out;
}

/**
 * Choose which notary takes a slot.
 *
 * Fewest live holds first, so work spreads rather than piling onto whoever
 * sorts first. Ties break on a rotation keyed by the slot's own timestamp,
 * which is deterministic — the same slot always picks the same notary given
 * the same free set — so this is testable and reproducible rather than random.
 *
 * @param {Slot} slot
 * @param {{staff_id: string, expires_at?: string}[]} [holds] all live holds, any time
 * @param {Date} [now]
 * @returns {string|null}
 */
export function pickStaff(slot, holds = [], now = new Date()) {
  if (!slot || !slot.staff || !slot.staff.length) return null;
  const load = new Map(slot.staff.map((s) => [s, 0]));
  for (const h of holds) {
    if (h.expires_at && ms(h.expires_at) <= now.getTime()) continue;
    const id = String(h.staff_id);
    if (load.has(id)) load.set(id, load.get(id) + 1);
  }
  const min = Math.min(...load.values());
  const tied = slot.staff.filter((s) => load.get(s) === min).sort();
  const rotation = Math.abs(Math.trunc(ms(slot.start) / 60000)) % tied.length;
  return tied[rotation];
}

/**
 * The wire shape for /api/availability.
 *
 * `slots` stays an array of ISO strings so the existing front end keeps
 * working, and `staff` carries the tagging alongside. Adding a field is
 * compatible; changing the shape of `slots` would not have been.
 */
export function toResponse(slots) {
  return {
    slots: slots.map((s) => s.start),
    staff: Object.fromEntries(slots.map((s) => [s.start, s.staff])),
    staff_count: new Set(slots.flatMap((s) => s.staff)).size,
  };
}

/** Parse the response shape back, tolerating a server that only sends `slots`. */
export function fromResponse(body) {
  const list = Array.isArray(body?.slots) ? body.slots : [];
  const tags = body && typeof body.staff === 'object' && body.staff ? body.staff : {};
  return list.map((start) => ({ start, staff: Array.isArray(tags[start]) ? tags[start] : [] }));
}
