// node --test lib/zoho-bookings.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  unwrap, parseStaffIds, parseTimeOfDay, parseSlotInstants, parseBookingId, parseISODate,
} from './zoho-bookings.mjs';

const PT = 'America/Los_Angeles';
const ctx = { date: '2026-09-01', timeZone: PT };

test('unwrap handles every wrapper Zoho has been documented using', () => {
  const rows = [{ id: '1' }];
  assert.deepEqual(unwrap({ response: { returnvalue: { data: rows } } }), rows);
  assert.deepEqual(unwrap({ returnvalue: { data: rows } }), rows);
  assert.deepEqual(unwrap({ data: rows }), rows);
  assert.deepEqual(unwrap(rows), rows);
  assert.deepEqual(unwrap({ response: { returnvalue: rows } }), rows);
  assert.deepEqual(unwrap({ response: { returnvalue: { staffs: rows } } }), rows);
});

test('unwrap returns an empty list rather than throwing on junk', () => {
  for (const junk of [null, undefined, 3, 'x', {}, { response: {} }]) {
    assert.deepEqual(unwrap(junk), [], String(junk));
  }
});

test('staff ids come out of objects, strings and the alternate key names', () => {
  assert.deepEqual(parseStaffIds({ response: { returnvalue: { data: [{ id: 'ada' }, { staff_id: 'grace' }] } } }),
    ['ada', 'grace']);
  assert.deepEqual(parseStaffIds(['ada', 'grace']), ['ada', 'grace']);
  assert.deepEqual(parseStaffIds([{ staffId: 'a' }, { resource_id: 'b' }]), ['a', 'b']);
  assert.deepEqual(parseStaffIds([{ id: 4400 }]), ['4400'], 'numeric ids become strings');
});

test('staff ids dedupe and drop empties without collapsing the rest', () => {
  assert.deepEqual(parseStaffIds([{ id: 'ada' }, { id: 'ada' }, { id: '' }, { name: 'no id' }, { id: 'zoe' }]),
    ['ada', 'zoe']);
  assert.deepEqual(parseStaffIds({}), []);
});

test('time of day parses both notations Zoho emits', () => {
  assert.deepEqual(parseTimeOfDay('09:00'), { hour: 9, minute: 0, second: 0 });
  assert.deepEqual(parseTimeOfDay('09:30:00'), { hour: 9, minute: 30, second: 0 });
  assert.deepEqual(parseTimeOfDay('9:15 AM'), { hour: 9, minute: 15, second: 0 });
  assert.deepEqual(parseTimeOfDay('1:05 pm'), { hour: 13, minute: 5, second: 0 });
  assert.deepEqual(parseTimeOfDay('12:00 AM'), { hour: 0, minute: 0, second: 0 }, 'midnight is 00, not 12');
  assert.deepEqual(parseTimeOfDay('12:00 PM'), { hour: 12, minute: 0, second: 0 }, 'noon stays 12');
  assert.equal(parseTimeOfDay('13:00 PM'), null, 'a 13 with a meridiem is nonsense, not 25:00');
  assert.equal(parseTimeOfDay('nope'), null);
  assert.equal(parseTimeOfDay(''), null);
});

test('bare times resolve against the given date and zone', () => {
  const { instants, unparsed } = parseSlotInstants(
    { response: { returnvalue: { data: ['09:00', '09:30'] } } }, ctx);
  // 1 Sep 2026 is PDT (UTC-7), so 09:00 local is 16:00Z.
  assert.deepEqual(instants, ['2026-09-01T16:00:00.000Z', '2026-09-01T16:30:00.000Z']);
  assert.deepEqual(unparsed, []);
});

test('the same times in the other notation give the same instants', () => {
  const a = parseSlotInstants(['09:00', '13:00'], ctx).instants;
  const b = parseSlotInstants(['9:00 AM', '1:00 PM'], ctx).instants;
  assert.deepEqual(a, b);
});

test('a Zoho stamp carries its own date and overrides the requested one', () => {
  const { instants } = parseSlotInstants(['02-Sep-2026 09:00:00'], ctx);
  assert.deepEqual(instants, ['2026-09-02T16:00:00.000Z']);
});

test('an ISO instant with an offset is taken as given, not reinterpreted', () => {
  // Reinterpreting this in Pacific would move it seven hours.
  const { instants } = parseSlotInstants(['2026-09-01T16:00:00Z'], ctx);
  assert.deepEqual(instants, ['2026-09-01T16:00:00.000Z']);
  assert.deepEqual(parseSlotInstants(['2026-09-01T12:00:00-04:00'], ctx).instants,
    ['2026-09-01T16:00:00.000Z']);
});

test('an ISO-shaped value with NO offset is local wall clock', () => {
  const { instants } = parseSlotInstants(['2026-09-01T09:00:00'], ctx);
  assert.deepEqual(instants, ['2026-09-01T16:00:00.000Z'], 'no offset means the staff zone');
});

test('slots arrive as objects too', () => {
  assert.deepEqual(parseSlotInstants([{ time: '09:00' }], ctx).instants, ['2026-09-01T16:00:00.000Z']);
  assert.deepEqual(parseSlotInstants([{ start_time: '09:00' }], ctx).instants, ['2026-09-01T16:00:00.000Z']);
  assert.deepEqual(parseSlotInstants([{ from_time: '02-Sep-2026 09:00:00' }], ctx).instants,
    ['2026-09-02T16:00:00.000Z']);
});

test('THE ONE THAT MATTERS: an unreadable format is reported, never silently empty', () => {
  // If a format change presented as "no availability" the page would show an
  // empty fortnight with a 200 and nobody would look.
  const { instants, unparsed } = parseSlotInstants(['half nine', '09:00'], ctx);
  assert.deepEqual(instants, ['2026-09-01T16:00:00.000Z']);
  assert.deepEqual(unparsed, ['half nine'], 'the caller can tell parsing failed');
});

test('results are sorted and deduped', () => {
  const { instants } = parseSlotInstants(['13:00', '09:00', '9:00 AM'], ctx);
  assert.deepEqual(instants, ['2026-09-01T16:00:00.000Z', '2026-09-01T20:00:00.000Z']);
});

test('a DST-gap slot is dropped from bookable times but recorded as unparsed', () => {
  // 8 Mar 2026 02:30 Pacific does not exist. Booking it would land an hour off.
  const { instants, unparsed } = parseSlotInstants(['02:30'], { date: '2026-03-08', timeZone: PT });
  assert.deepEqual(instants, []);
  assert.deepEqual(unparsed, ['02:30']);
});

test('the date either parses or the parser refuses to guess', () => {
  assert.deepEqual(parseISODate('2026-09-01'), { year: 2026, month: 9, day: 1 });
  assert.equal(parseISODate('01-Sep-2026'), null);
  assert.throws(() => parseSlotInstants(['09:00'], { date: 'today', timeZone: PT }), /YYYY-MM-DD/);
  assert.throws(() => parseSlotInstants(['09:00'], { date: '2026-09-01', timeZone: 'Mars/Olympus' }), /unknown IANA/);
});

test('an empty response is empty, and says nothing failed', () => {
  const { instants, unparsed } = parseSlotInstants({ response: { returnvalue: { data: [] } } }, ctx);
  assert.deepEqual(instants, []);
  assert.deepEqual(unparsed, [], 'a genuinely free-of-slots day is distinguishable from a parse failure');
});

test('booking id is found wherever Zoho puts it', () => {
  assert.equal(parseBookingId({ response: { returnvalue: { booking_id: '99' } } }), '99');
  assert.equal(parseBookingId({ response: { returnvalue: { booking_ids: ['99', '100'] } } }), '99');
  assert.equal(parseBookingId({ data: { booking_id: 12 } }), '12');
  assert.equal(parseBookingId({ response: { returnvalue: { data: [{ booking_id: '7' }] } } }), '7');
  assert.equal(parseBookingId({ response: { returnvalue: {} } }), null);
  assert.equal(parseBookingId(null), null);
});
