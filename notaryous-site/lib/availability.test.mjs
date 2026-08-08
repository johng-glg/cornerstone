// node --test lib/availability.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeStaffAvailability, subtractHolds, pickStaff, toResponse, fromResponse,
} from './availability.mjs';

const T9  = '2026-09-01T16:00:00.000Z';
const T10 = '2026-09-01T17:00:00.000Z';
const T11 = '2026-09-01T18:00:00.000Z';
const future = '2099-01-01T00:00:00.000Z';
const past   = '2020-01-01T00:00:00.000Z';

test('merge unions times and tags each with who is free', () => {
  const out = mergeStaffAvailability({
    ada:   [T9, T10],
    grace: [T10, T11],
  });
  assert.deepEqual(out, [
    { start: T9,  staff: ['ada'] },
    { start: T10, staff: ['ada', 'grace'] },
    { start: T11, staff: ['grace'] },
  ]);
});

test('merge is sorted by time and staff, whatever order it arrives in', () => {
  const out = mergeStaffAvailability({ zoe: [T11, T9], ada: [T11] });
  assert.deepEqual(out.map((s) => s.start), [T9, T11]);
  assert.deepEqual(out[1].staff, ['ada', 'zoe']);
});

test('merge normalises equivalent instants written differently', () => {
  const out = mergeStaffAvailability({ ada: ['2026-09-01T17:00:00Z'], grace: ['2026-09-01T17:00:00.000+00:00'] });
  assert.equal(out.length, 1, 'the same moment is one slot');
  assert.deepEqual(out[0].staff, ['ada', 'grace']);
});

test('merge drops a malformed instant rather than booking it', () => {
  const out = mergeStaffAvailability({ ada: ['not-a-date', T9] });
  assert.deepEqual(out, [{ start: T9, staff: ['ada'] }]);
});

test('merge of nothing is an empty list, not a throw', () => {
  assert.deepEqual(mergeStaffAvailability({}), []);
  assert.deepEqual(mergeStaffAvailability(null), []);
  assert.deepEqual(mergeStaffAvailability({ ada: null }), []);
});

test('THE ONE THAT MATTERS: holding one notary does not hide the slot', () => {
  // With staff-blind subtraction this slot would vanish and two thirds of the
  // diary would disappear the moment anyone opened a checkout.
  const slots = mergeStaffAvailability({ ada: [T10], grace: [T10], zoe: [T10] });
  const out = subtractHolds(slots, [{ slot_start_utc: T10, staff_id: 'ada', expires_at: future }]);
  assert.equal(out.length, 1, 'the slot survives');
  assert.deepEqual(out[0].staff, ['grace', 'zoe'], 'only the held notary is removed');
});

test('a slot disappears only when every notary on it is held', () => {
  const slots = mergeStaffAvailability({ ada: [T10], grace: [T10] });
  const holds = [
    { slot_start_utc: T10, staff_id: 'ada', expires_at: future },
    { slot_start_utc: T10, staff_id: 'grace', expires_at: future },
  ];
  assert.deepEqual(subtractHolds(slots, holds), []);
});

test('an expired hold takes nothing away', () => {
  const slots = mergeStaffAvailability({ ada: [T10] });
  const out = subtractHolds(slots, [{ slot_start_utc: T10, staff_id: 'ada', expires_at: past }]);
  assert.deepEqual(out, [{ start: T10, staff: ['ada'] }]);
});

test('a hold only affects its own time', () => {
  const slots = mergeStaffAvailability({ ada: [T9, T10, T11] });
  const out = subtractHolds(slots, [{ slot_start_utc: T10, staff_id: 'ada', expires_at: future }]);
  assert.deepEqual(out.map((s) => s.start), [T9, T11]);
});

test('a hold for a notary not on the slot is harmless', () => {
  const slots = mergeStaffAvailability({ ada: [T10] });
  const out = subtractHolds(slots, [{ slot_start_utc: T10, staff_id: 'someone-else', expires_at: future }]);
  assert.deepEqual(out[0].staff, ['ada']);
});

test('subtractHolds does not mutate its input', () => {
  const slots = mergeStaffAvailability({ ada: [T10], grace: [T10] });
  const before = JSON.stringify(slots);
  subtractHolds(slots, [{ slot_start_utc: T10, staff_id: 'ada', expires_at: future }]);
  assert.equal(JSON.stringify(slots), before);
});

test('pickStaff returns somebody free, and null when nobody is', () => {
  assert.ok(['ada', 'grace'].includes(pickStaff({ start: T10, staff: ['ada', 'grace'] })));
  assert.equal(pickStaff({ start: T10, staff: [] }), null);
  assert.equal(pickStaff(null), null);
});

test('pickStaff prefers the least loaded notary', () => {
  const slot = { start: T10, staff: ['ada', 'grace'] };
  const holds = [
    { slot_start_utc: T9,  staff_id: 'ada', expires_at: future },
    { slot_start_utc: T11, staff_id: 'ada', expires_at: future },
  ];
  assert.equal(pickStaff(slot, holds), 'grace', 'ada already has two holds');
});

test('pickStaff ignores expired holds when weighing load', () => {
  const slot = { start: T10, staff: ['ada', 'grace'] };
  const stale = [
    { slot_start_utc: T9, staff_id: 'grace', expires_at: past },
    { slot_start_utc: T11, staff_id: 'grace', expires_at: past },
  ];
  // grace's holds are dead, so load is level and the rotation decides — but it
  // must not punish grace for holds that no longer exist.
  const picked = pickStaff(slot, stale);
  assert.ok(['ada', 'grace'].includes(picked));
  const loaded = pickStaff(slot, [...stale, { slot_start_utc: T9, staff_id: 'ada', expires_at: future }]);
  assert.equal(loaded, 'grace', 'only the live hold counts, and it is against ada');
});

test('pickStaff is deterministic — same inputs, same notary', () => {
  const slot = { start: T10, staff: ['ada', 'grace', 'zoe'] };
  const a = pickStaff(slot);
  for (let i = 0; i < 20; i++) assert.equal(pickStaff(slot), a);
});

test('pickStaff spreads across slots rather than always picking the first', () => {
  const staff = ['ada', 'grace', 'zoe'];
  const chosen = new Set();
  for (let i = 0; i < 30; i++) {
    const start = new Date(Date.UTC(2026, 8, 1, 9, 0) + i * 60000).toISOString();
    chosen.add(pickStaff({ start, staff }));
  }
  assert.equal(chosen.size, 3, 'every notary gets work across a run of slots');
});

test('pickStaff never returns a held notary once holds are subtracted', () => {
  const slots = mergeStaffAvailability({ ada: [T10], grace: [T10] });
  const holds = [{ slot_start_utc: T10, staff_id: 'ada', expires_at: future }];
  const free = subtractHolds(slots, holds);
  assert.equal(pickStaff(free[0], holds), 'grace');
});

test('single-notary services still work end to end', () => {
  const slots = mergeStaffAvailability({ solo: [T9, T10] });
  assert.deepEqual(slots.map((s) => s.staff), [['solo'], ['solo']]);
  assert.equal(pickStaff(slots[0]), 'solo');
  const held = subtractHolds(slots, [{ slot_start_utc: T9, staff_id: 'solo', expires_at: future }]);
  assert.deepEqual(held.map((s) => s.start), [T10], 'the only notary being held does remove the slot');
});

test('wire shape round-trips, and slots stays a plain ISO array', () => {
  const slots = mergeStaffAvailability({ ada: [T9, T10], grace: [T10] });
  const body = toResponse(slots);
  assert.deepEqual(body.slots, [T9, T10]);
  assert.ok(body.slots.every((s) => typeof s === 'string'), 'existing clients keep working');
  assert.deepEqual(body.staff[T10], ['ada', 'grace']);
  assert.equal(body.staff_count, 2);
  assert.deepEqual(fromResponse(body), slots);
});

test('fromResponse tolerates a server that sends only slots', () => {
  const out = fromResponse({ slots: [T9] });
  assert.deepEqual(out, [{ start: T9, staff: [] }]);
  assert.deepEqual(fromResponse({}), []);
  assert.deepEqual(fromResponse(null), []);
});
