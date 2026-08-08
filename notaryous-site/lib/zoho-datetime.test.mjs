// node --test lib/zoho-datetime.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  zohoFromTime, zohoDate, isoDateInZone, assertTimeZone,
  wallClockToUTC, zoneOffsetMinutes, ZOHO_DATETIME_RE,
} from './zoho-datetime.mjs';

const LA = 'America/Los_Angeles';
const NY = 'America/New_York';

test('the format Zoho documents', () => {
  // 19:00Z on 28 Jan is 11:00 PST — the example from the API docs.
  assert.equal(zohoFromTime('2026-01-28T19:00:00Z', LA), '28-Jan-2026 11:00:00');
  assert.match(zohoFromTime('2026-01-28T19:00:00Z', LA), ZOHO_DATETIME_RE);
});

test('never emits an ISO string', () => {
  const out = zohoFromTime('2026-01-28T19:00:00Z', LA);
  assert.ok(!out.includes('T'), out);
  assert.ok(!out.includes('Z'), out);
});

test('day is zero-padded', () => {
  assert.equal(zohoFromTime('2026-03-05T20:00:00Z', LA), '05-Mar-2026 12:00:00');
});

test('midnight is 00:00:00, never 24:00:00', () => {
  // The h23-vs-h24 trap: h24 renders midnight as 24:00:00 on the PREVIOUS day,
  // which books a full day and an hour away from what the customer picked.
  const out = zohoFromTime('2026-06-15T07:00:00Z', LA); // 00:00 PDT on the 15th
  assert.equal(out, '15-Jun-2026 00:00:00');
});

test('noon and 23:00 are unambiguous', () => {
  assert.equal(zohoFromTime('2026-06-15T19:00:00Z', LA), '15-Jun-2026 12:00:00');
  assert.equal(zohoFromTime('2026-06-16T06:00:00Z', LA), '15-Jun-2026 23:00:00');
});

test('every month abbreviates to three English letters', () => {
  const expect = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let m = 0; m < 12; m++) {
    const iso = `2026-${String(m + 1).padStart(2, '0')}-15T18:00:00Z`;
    assert.equal(zohoFromTime(iso, LA).slice(3, 6), expect[m]);
  }
});

test('DST: the same wall-clock hour maps to different UTC instants', () => {
  // 2026-03-08 is US spring forward. 10:00Z is 03:00 PDT (UTC-7);
  // the day before, 10:00Z is 02:00 PST (UTC-8).
  assert.equal(zohoFromTime('2026-03-07T10:00:00Z', LA), '07-Mar-2026 02:00:00');
  assert.equal(zohoFromTime('2026-03-08T10:00:00Z', LA), '08-Mar-2026 03:00:00');
});

test('DST fall-back: both occurrences of 01:30 render identically', () => {
  // Inherent to a wall-clock format. Documented, and the reason we always
  // derive from a UTC instant rather than round-tripping the string.
  const first  = zohoFromTime('2026-11-01T08:30:00Z', LA); // 01:30 PDT
  const second = zohoFromTime('2026-11-01T09:30:00Z', LA); // 01:30 PST
  assert.equal(first, '01-Nov-2026 01:30:00');
  assert.equal(second, '01-Nov-2026 01:30:00');
});

test('zone actually changes the answer', () => {
  const iso = '2026-01-28T19:00:00Z';
  assert.equal(zohoFromTime(iso, LA), '28-Jan-2026 11:00:00');
  assert.equal(zohoFromTime(iso, NY), '28-Jan-2026 14:00:00');
  assert.equal(zohoFromTime(iso, 'UTC'), '28-Jan-2026 19:00:00');
});

test('half-hour and quarter-hour offsets', () => {
  assert.equal(zohoFromTime('2026-01-28T19:00:00Z', 'Asia/Kolkata'), '29-Jan-2026 00:30:00');
  assert.equal(zohoFromTime('2026-01-28T19:00:00Z', 'Asia/Kathmandu'), '29-Jan-2026 00:45:00');
});

test('a zone change can roll the date', () => {
  // 03:00Z on the 29th is still the 28th in LA. Getting this wrong books a day out.
  assert.equal(zohoFromTime('2026-01-29T03:00:00Z', LA), '28-Jan-2026 19:00:00');
});

test('output does not depend on the runtime time zone', () => {
  // The production guard: Vercel runs UTC, laptops do not.
  const iso = '2026-01-28T19:00:00Z';
  const expected = '28-Jan-2026 11:00:00';
  const original = process.env.TZ;
  try {
    for (const tz of ['UTC', 'America/New_York', 'Asia/Tokyo', 'Pacific/Kiritimati']) {
      process.env.TZ = tz;
      assert.equal(zohoFromTime(iso, LA), expected, `runtime TZ=${tz}`);
    }
  } finally {
    if (original === undefined) delete process.env.TZ; else process.env.TZ = original;
  }
});

test('accepts Date and epoch ms as well as ISO', () => {
  const iso = '2026-01-28T19:00:00Z';
  const expected = '28-Jan-2026 11:00:00';
  assert.equal(zohoFromTime(new Date(iso), LA), expected);
  assert.equal(zohoFromTime(Date.parse(iso), LA), expected);
});

test('rejects bad input rather than emitting a wrong time', () => {
  assert.throws(() => zohoFromTime('not a date', LA), /invalid instant/);
  assert.throws(() => zohoFromTime('2026-01-28T19:00:00Z', 'Mars/Olympus'), /invalid IANA time zone/);
  assert.throws(() => assertTimeZone(''), /required/);
  assert.throws(() => assertTimeZone('Nowhere/Anywhere'), /unknown IANA/);
  assert.equal(assertTimeZone(LA), LA);
});

test('zohoDate and isoDateInZone agree with zohoFromTime', () => {
  const iso = '2026-01-29T03:00:00Z';
  assert.equal(zohoDate(iso, LA), '28-Jan-2026');
  assert.equal(isoDateInZone(iso, LA), '2026-01-28');
  assert.equal(zohoFromTime(iso, LA).slice(0, 11), zohoDate(iso, LA));
});

test('zoneOffsetMinutes tracks DST', () => {
  assert.equal(zoneOffsetMinutes('2026-01-15T12:00:00Z', LA), -480); // PST
  assert.equal(zoneOffsetMinutes('2026-07-15T12:00:00Z', LA), -420); // PDT
  assert.equal(zoneOffsetMinutes('2026-01-15T12:00:00Z', 'Asia/Kolkata'), 330);
});

test('wallClockToUTC round-trips through zohoFromTime', () => {
  const cases = [
    { wall: { year: 2026, month: 1, day: 28, hour: 11 }, tz: LA },
    { wall: { year: 2026, month: 7, day: 4,  hour: 9, minute: 30 }, tz: LA },
    { wall: { year: 2026, month: 11, day: 15, hour: 0 }, tz: NY },
    { wall: { year: 2026, month: 3, day: 9,  hour: 2 }, tz: LA }, // day after transition
  ];
  for (const { wall, tz } of cases) {
    const instant = wallClockToUTC(wall, tz);
    const back = zohoFromTime(instant, tz);
    const expect = `${String(wall.day).padStart(2, '0')}-` +
      ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][wall.month - 1] +
      `-${wall.year} ${String(wall.hour).padStart(2, '0')}:` +
      `${String(wall.minute ?? 0).padStart(2, '0')}:00`;
    assert.equal(back, expect, JSON.stringify(wall) + ' ' + tz);
  }
});

test('wallClockToUTC throws on the spring-forward gap rather than shifting an hour', () => {
  // 02:30 on 2026-03-08 does not exist in LA — the clock goes 01:59 -> 03:00.
  // No instant satisfies it, and the naive two-pass answer lands on 01:30,
  // an hour before what was asked for. Booking that silently is the failure
  // mode this whole module exists to prevent, so it throws instead.
  assert.throws(
    () => wallClockToUTC({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, LA),
    /does not exist in America\/Los_Angeles.*spring-forward gap/s,
  );
  // The hour either side is fine.
  assert.equal(
    zohoFromTime(wallClockToUTC({ year: 2026, month: 3, day: 8, hour: 1, minute: 30 }, LA), LA),
    '08-Mar-2026 01:30:00');
  assert.equal(
    zohoFromTime(wallClockToUTC({ year: 2026, month: 3, day: 8, hour: 3, minute: 30 }, LA), LA),
    '08-Mar-2026 03:30:00');
});

test('wallClockToUTC on the fall-back overlap returns the earlier instant', () => {
  // 01:30 on 2026-11-01 happens twice in LA. Both are legitimate; the earlier
  // (PDT) one is returned, and it round-trips.
  const d = wallClockToUTC({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, LA);
  assert.equal(zohoFromTime(d, LA), '01-Nov-2026 01:30:00');
  assert.equal(d.toISOString(), '2026-11-01T08:30:00.000Z'); // PDT, the first pass
});
