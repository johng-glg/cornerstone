// node --test api/availability.test.mjs
//
// The route end to end with Zoho and Supabase stubbed at fetch. The point is
// the staff-optional behaviour: no staff_id in, combined availability out, and
// a hold against one notary never hiding a time another notary is free for.
import test from 'node:test';
import assert from 'node:assert/strict';

const DIR = new URL('.', import.meta.url).pathname;
let version = 0;
const loadRoute = async () => (await import(DIR + `availability.mjs?v=${++version}`)).default;

const ENV = {
  ZOHO_CLIENT_ID: 'cid',
  ZOHO_CLIENT_SECRET: 'sec',
  ZOHO_REFRESH_TOKEN: 'ref',
  ZOHO_SERVICE_ID: 'svc',
  ZOHO_ORG_TIMEZONE: 'America/Los_Angeles',
  BOOKING_MIN_NOTICE_MINUTES: '0',
  AVAILABILITY_CACHE_TTL_MS: '0',
  SUPABASE_URL: 'https://db.example.test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
};

// The route is reloaded per test with a cache-busting query, but `_zoho.mjs`
// resolves to the same specifier and is NOT reloaded — so its roster cache
// survives between tests and would leak one test's staff into the next.
const { clearStaffCache } = await import(DIR + '_zoho.mjs');

function setEnv(overrides = {}) {
  for (const k of ['ZOHO_STAFF_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) delete process.env[k];
  Object.assign(process.env, ENV, overrides);
  for (const [k, v] of Object.entries(overrides)) if (v === undefined) delete process.env[k];
  clearStaffCache();
}

function mockRes() {
  return {
    statusCode: 200, headers: {}, body: '',
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(b) { this.body = b ?? ''; return this; },
    json() { return JSON.parse(this.body); },
  };
}

const call = async (handler, query = '') => {
  const res = mockRes();
  await handler({ method: 'GET', url: `/api/availability${query}`, headers: {} }, res);
  return res;
};

/**
 * A fake Zoho + Supabase.
 * @param {object} opts
 *   staff   — staff ids the roster endpoint returns
 *   slots   — staffId → time-of-day strings offered on every requested date
 *   holds   — rows the slot_holds query returns
 *   failFor — staff ids whose availability call 500s
 */
function stub({ staff = ['ada', 'grace'], slots = {}, holds = [], booked = [], failFor = [] } = {}) {
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push(url);
    const json = (obj, status = 200) => ({
      ok: status < 400, status,
      text: async () => JSON.stringify(obj),
    });
    if (url.includes('/oauth/v2/token')) return json({ access_token: 'tok', expires_in: 3600 });
    if (url.includes('/staffs')) return json({ response: { returnvalue: { data: staff.map((id) => ({ id })) } } });
    if (url.includes('/availableslots')) {
      const staffId = new URL(url).searchParams.get('staff_id');
      if (failFor.includes(staffId)) return json({ error: 'boom' }, 500);
      return json({ response: { returnvalue: { data: slots[staffId] ?? [] } } });
    }
    if (url.includes('/rest/v1/slot_holds')) return json(holds);
    if (url.includes('/rest/v1/bookings')) return json(booked);
    throw new Error(`unexpected fetch: ${url}`);
  };
  return calls;
}

/**
 * A window that is in the future and lands inside ONE Pacific calendar date —
 * 16:00Z to 23:00Z is 08:00–16:00 local whether the offset is -7 or -8. The
 * route asks Zoho once per date per notary, so a window that straddled midnight
 * Pacific would return each stubbed time twice and every count below would be
 * off by a factor of two.
 */
const WINDOW = () => {
  const from = new Date(Date.now() + 3 * 86400000);
  from.setUTCHours(16, 0, 0, 0);
  const to = new Date(from.getTime() + 7 * 3600000);
  return { q: `?from=${from.toISOString()}&to=${to.toISOString()}`, date: from.toISOString().slice(0, 10) };
};

test('with no staff_id it combines every notary on the service', async () => {
  setEnv();
  stub({ staff: ['ada', 'grace'], slots: { ada: ['09:00', '10:00'], grace: ['10:00', '11:00'] } });
  const { q } = WINDOW();
  const res = await call(await loadRoute(), q);
  assert.equal(res.statusCode, 200, res.body);
  const body = res.json();
  assert.equal(body.slots.length, 3, '09:00, 10:00 and 11:00 — the union, not one diary');
  assert.equal(body.staff_count, 2);
  const ten = body.slots.find((s) => body.staff[s].length === 2);
  assert.deepEqual(body.staff[ten], ['ada', 'grace'], 'the shared time is tagged with both');
});

test('THE ONE THAT MATTERS: a hold on one notary leaves the time bookable', async () => {
  setEnv();
  const { q, date } = WINDOW();
  // 10:00 Pacific on that date, as the instant the merge will produce.
  const first = await (async () => {
    stub({ slots: { ada: ['10:00'], grace: ['10:00'] } });
    return (await call(await loadRoute(), q)).json().slots[0];
  })();

  stub({
    slots: { ada: ['10:00'], grace: ['10:00'] },
    holds: [{ slot_start_utc: first, staff_id: 'ada', expires_at: '2099-01-01T00:00:00Z' }],
  });
  const body = (await call(await loadRoute(), q)).json();
  assert.equal(body.slots.length, 1, `${date} 10:00 must survive ada being held`);
  assert.deepEqual(body.staff[body.slots[0]], ['grace']);
});

test('a time disappears only when every notary on it is held', async () => {
  setEnv();
  const { q } = WINDOW();
  stub({ slots: { ada: ['10:00'], grace: ['10:00'] } });
  const iso = (await call(await loadRoute(), q)).json().slots[0];

  stub({
    slots: { ada: ['10:00'], grace: ['10:00'] },
    holds: [
      { slot_start_utc: iso, staff_id: 'ada', expires_at: '2099-01-01T00:00:00Z' },
      { slot_start_utc: iso, staff_id: 'grace', expires_at: '2099-01-01T00:00:00Z' },
    ],
  });
  assert.deepEqual((await call(await loadRoute(), q)).json().slots, []);
});

test('a sold slot blocks that notary permanently, not just for the hold window', async () => {
  setEnv();
  const { q } = WINDOW();
  stub({ slots: { ada: ['10:00'], grace: ['10:00'] } });
  const iso = (await call(await loadRoute(), q)).json().slots[0];

  stub({
    slots: { ada: ['10:00'], grace: ['10:00'] },
    booked: [{ slot_start_utc: iso, staff_id: 'grace' }],
  });
  const body = (await call(await loadRoute(), q)).json();
  assert.deepEqual(body.staff[body.slots[0]], ['ada']);
});

test('staff_id still works as a filter for one notary', async () => {
  setEnv();
  const { q } = WINDOW();
  stub({ slots: { ada: ['09:00'], grace: ['11:00'] } });
  const body = (await call(await loadRoute(), q + '&staff_id=ada')).json();
  assert.equal(body.slots.length, 1);
  assert.deepEqual(body.staff[body.slots[0]], ['ada']);

  stub({ slots: { ada: ['09:00'] } });
  const bad = await call(await loadRoute(), q + '&staff_id=nobody');
  assert.equal(bad.statusCode, 400);
  assert.equal(bad.json().error, 'unknown_staff');
});

test('ZOHO_STAFF_ID pins the roster without a lookup', async () => {
  setEnv({ ZOHO_STAFF_ID: 'grace' });
  const { q } = WINDOW();
  const calls = stub({ staff: ['ada', 'grace'], slots: { grace: ['11:00'] } });
  const body = (await call(await loadRoute(), q)).json();
  assert.equal(body.staff_count, 1);
  assert.ok(!calls.some((u) => u.includes('/staffs')), 'the override skips staff discovery entirely');
});

test('an empty roster is an error, never an empty calendar', async () => {
  setEnv();
  stub({ staff: [] });
  const res = await call(await loadRoute(), WINDOW().q);
  assert.equal(res.statusCode, 502);
  assert.equal(res.json().error, 'no_staff');
});

test('one notary failing does not take the others down with it', async () => {
  setEnv();
  stub({ slots: { ada: ['09:00'], grace: ['11:00'] }, failFor: ['ada'] });
  const res = await call(await loadRoute(), WINDOW().q);
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().slots.length, 1, "grace's diary is still published");
});

test('every notary failing is a 502, not a fortnight of nothing', async () => {
  setEnv();
  stub({ slots: { ada: ['09:00'] }, failFor: ['ada', 'grace'] });
  const res = await call(await loadRoute(), WINDOW().q);
  assert.equal(res.statusCode, 502);
  assert.equal(res.json().error, 'upstream');
});

test('a response format Zoho changed is reported, not published as empty', async () => {
  setEnv();
  stub({ slots: { ada: ['half nine'], grace: ['quarter past'] } });
  const res = await call(await loadRoute(), WINDOW().q);
  assert.equal(res.statusCode, 502);
  assert.equal(res.json().error, 'unreadable_availability');
  assert.deepEqual(res.json().sample, ['half nine', 'quarter past']);
});

test('a genuinely empty diary is a 200 with no slots', async () => {
  setEnv();
  stub({ slots: {} });
  const res = await call(await loadRoute(), WINDOW().q);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json().slots, []);
  assert.equal(res.json().staff_count, 0);
});

test('without a database the response says holds were not applied', async () => {
  setEnv({ SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined });
  stub({ slots: { ada: ['09:00'] } });
  const body = (await call(await loadRoute(), WINDOW().q)).json();
  assert.equal(body.source, 'zoho-no-holds');
  assert.equal(body.slots.length, 1);
});

test('lead time removes slots too soon to survive a checkout', async () => {
  setEnv({ BOOKING_MIN_NOTICE_MINUTES: '600000' });   // ~14 months
  stub({ slots: { ada: ['09:00'], grace: ['11:00'] } });
  const body = (await call(await loadRoute(), WINDOW().q)).json();
  assert.deepEqual(body.slots, []);
});

test('the window is clamped and a bad one is rejected', async () => {
  setEnv();
  stub({ slots: {} });
  const h = await loadRoute();
  const from = new Date(Date.now() + 86400000).toISOString();
  const far = new Date(Date.now() + 400 * 86400000).toISOString();
  const body = (await call(h, `?from=${from}&to=${far}`)).json();
  const span = Date.parse(body.window.to) - Date.parse(body.window.from);
  assert.ok(span <= 31 * 86400000, 'a year-long request is clamped to a month');

  const back = await call(h, `?from=${far}&to=${from}`);
  assert.equal(back.statusCode, 400);
  assert.equal(back.json().error, 'bad_window');
});

test('missing configuration is a 503 that names what is missing', async () => {
  setEnv();
  delete process.env.ZOHO_SERVICE_ID;
  stub();
  const res = await call(await loadRoute(), WINDOW().q);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.json().missing, ['ZOHO_SERVICE_ID']);
  process.env.ZOHO_SERVICE_ID = 'svc';
});

test('POST is refused', async () => {
  setEnv();
  stub();
  const res = mockRes();
  await (await loadRoute())({ method: 'POST', url: '/api/availability', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});

test('daysBetween covers every date the window touches, across a DST change', async () => {
  const { daysBetween } = await import(DIR + 'availability.mjs?v=days');
  const tz = 'America/Los_Angeles';
  // 7 Mar 2026 → 10 Mar 2026 spans the US spring-forward on the 8th.
  const days = daysBetween(new Date('2026-03-07T12:00:00Z'), new Date('2026-03-10T12:00:00Z'), tz);
  const keys = days.map((d) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d));
  assert.deepEqual(keys, ['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10']);
});
