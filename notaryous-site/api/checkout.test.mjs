// node --test api/checkout.test.mjs
//
// /api/checkout and /api/confirm end to end with Zoho and Supabase stubbed at
// fetch. The tests that matter are the ones about ordering: nothing is created
// before payment is verified, and nothing is created twice.
import test from 'node:test';
import assert from 'node:assert/strict';

const DIR = new URL('.', import.meta.url).pathname;
let v = 0;
const load = async (route) => (await import(DIR + `${route}.mjs?v=${++v}`)).default;
const { clearStaffCache } = await import(DIR + '_zoho.mjs');

const ENV = {
  ZOHO_CLIENT_ID: 'cid', ZOHO_CLIENT_SECRET: 'sec', ZOHO_REFRESH_TOKEN: 'ref',
  ZOHO_SERVICE_ID: 'svc', ZOHO_ORG_TIMEZONE: 'America/Los_Angeles',
  ZOHO_PAY_REFRESH_TOKEN: 'pref', ZOHO_PAY_ACCOUNT_ID: 'acct',
  SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'srk',
  BOOKING_MIN_NOTICE_MINUTES: '0', AVAILABILITY_CACHE_TTL_MS: '0',
};
function setEnv(o = {}) {
  for (const k of ['ZOHO_STAFF_ID', 'BOOKING_IS_TEST']) delete process.env[k];
  Object.assign(process.env, ENV, o);
  clearStaffCache();
}

const mockRes = () => ({
  statusCode: 200, headers: {}, body: '',
  setHeader(k, v2) { this.headers[k.toLowerCase()] = v2; },
  end(b) { this.body = b ?? ''; return this; },
  json() { return JSON.parse(this.body); },
});
const post = async (h, body) => {
  const res = mockRes();
  await h({ method: 'POST', url: '/x', headers: { 'content-type': 'application/json' }, body }, res);
  return res;
};

// A slot inside one Pacific day, comfortably in the future.
const SLOT = (() => { const d = new Date(Date.now() + 3 * 86400000); d.setUTCHours(17, 0, 0, 0); return d.toISOString(); })();
const SIGNER = { name: 'Ada Lovelace', email: 'ada@example.test', phone: '7145551234', timezone: 'America/New_York' };

/** Records every call so ordering can be asserted, not assumed. */
function stub(opts = {}) {
  const {
    staff = ['st_1', 'st_2'], available = true, holds = [], booked = [],
    claimWins = true, sessionCreate = { payments_session: { payments_session_id: 'ps_1', created_time: 1786227520, expiry_time: 1786228420 } },
    sessionRetrieve = null, appointmentOk = true, existingBooking = [],
  } = opts;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const method = init.method || 'GET';
    calls.push(`${method} ${url.replace(/^https?:\/\/[^/]+/, '')}`);
    const json = (obj, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(obj) });

    if (url.includes('/oauth/v2/token')) return json({ access_token: 't', expires_in: 3600 });
    if (url.includes('/staffs')) return json({ response: { returnvalue: { data: staff.map((id) => ({ id })) } } });
    if (url.includes('/availableslots')) {
      // 17:00Z is 10:00 Pacific in summer, 09:00 in winter — offer both.
      return json({ response: { returnvalue: { data: available ? ['09:00', '10:00'] : [] } } });
    }
    if (url.includes('/rest/v1/rpc/claim_slot_hold')) {
      return json(claimWins ? [{ id: 'hold_1', expires_at: '2099-01-01T00:00:00Z' }] : []);
    }
    if (url.includes('/rest/v1/rpc/record_calendar_booking')) return json([{ booking_id: 'SI-1' }]);
    if (url.includes('/rest/v1/slot_holds')) return json(method === 'GET' ? holds : []);
    if (url.includes('/rest/v1/ron_sessions')) return json(method === 'GET' ? (existingBooking.length ? existingBooking : booked) : []);
    if (url.includes('/paymentsessions/')) return json(sessionRetrieve ?? {}, sessionRetrieve ? 200 : 404);
    if (url.includes('/paymentsessions')) return json(sessionCreate, sessionCreate ? 200 : 500);
    if (url.includes('/appointment')) {
      return appointmentOk
        ? json({ response: { returnvalue: { booking_id: 'SI-99' } } })
        : json({ response: { returnvalue: {} } }, 500);
    }
    throw new Error(`unexpected fetch: ${url}`);
  };
  return calls;
}

const paidSession = (meta) => ({
  payments_session: {
    payments_session_id: 'ps_1', status: 'succeeded', payment_id: 'pay_9',
    created_time: 1786227520, expiry_time: 1786228420,
    meta_data: Object.entries(meta).map(([key, value]) => ({ key, value: String(value) })),
  },
});
const META = { slot: SLOT, staff_id: 'st_1', timezone: 'America/New_York', email: 'ada@example.test', first_name: 'Ada', last_name: 'Lovelace', phone: '7145551234' };

// ── checkout ───────────────────────────────────────────────────────────────

test('checkout claims a hold and opens a session — and creates NO appointment', async () => {
  setEnv();
  const calls = stub();
  const res = await post(await load('checkout'), { ...SIGNER, slot: SLOT });
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(res.json().payment_session_id, 'ps_1');
  assert.ok(!calls.some((c) => c.includes('/appointment')), 'no appointment may exist before payment');
});

test('the hold is claimed BEFORE the payment session is created', async () => {
  setEnv();
  const calls = stub();
  await post(await load('checkout'), { ...SIGNER, slot: SLOT });
  const claim = calls.findIndex((c) => c.includes('claim_slot_hold'));
  const session = calls.findIndex((c) => c.includes('POST /api/v1/paymentsessions'));
  assert.ok(claim >= 0 && session >= 0, calls.join('\n'));
  assert.ok(claim < session, 'a customer must never pay for a slot we could not hold');
});

test('losing the claim is a 409, with no payment session created', async () => {
  setEnv();
  const calls = stub({ claimWins: false });
  const res = await post(await load('checkout'), { ...SIGNER, slot: SLOT });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().error, 'slot_taken');
  assert.ok(!calls.some((c) => c.includes('POST /api/v1/paymentsessions')), 'nothing charged for a lost slot');
});

test('a slot Zoho no longer offers is refused', async () => {
  setEnv();
  stub({ available: false });
  const res = await post(await load('checkout'), { ...SIGNER, slot: SLOT });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().error, 'slot_taken');
});

test('availability is re-derived from Zoho, not taken from the request', async () => {
  setEnv();
  const calls = stub();
  await post(await load('checkout'), { ...SIGNER, slot: SLOT });
  assert.ok(calls.some((c) => c.includes('/availableslots')), 'the browser is not believed about the slot');
});

test('a payment session failure leaves the hold to expire rather than booking', async () => {
  setEnv();
  const calls = stub({ sessionCreate: null });
  const res = await post(await load('checkout'), { ...SIGNER, slot: SLOT });
  assert.equal(res.statusCode, 502);
  assert.match(res.json().detail, /Nothing has been charged/);
  assert.ok(!calls.some((c) => c.includes('/appointment')));
});

test('bad input is rejected per field, before anything is claimed', async () => {
  setEnv();
  const calls = stub();
  const res = await post(await load('checkout'), { slot: SLOT, timezone: 'America/New_York', name: '', email: 'nope', phone: '1' });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(Object.keys(res.json().fields).sort(), ['email', 'name', 'phone']);
  assert.equal(calls.length, 0, 'not one call to Zoho for a malformed request');
});

test('a slot in the past is refused', async () => {
  setEnv({ BOOKING_MIN_NOTICE_MINUTES: '60' });
  stub();
  const res = await post(await load('checkout'), { ...SIGNER, slot: new Date(Date.now() + 60_000).toISOString() });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().error, 'too_soon');
});

test('checkout refuses to run without a database', async () => {
  setEnv();
  delete process.env.SUPABASE_URL;
  stub();
  const res = await post(await load('checkout'), { ...SIGNER, slot: SLOT });
  assert.equal(res.statusCode, 503);
  process.env.SUPABASE_URL = ENV.SUPABASE_URL;
});

test('GET is refused', async () => {
  setEnv();
  stub();
  const res = mockRes();
  await (await load('checkout'))({ method: 'GET', url: '/x', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});

// ── confirm ────────────────────────────────────────────────────────────────

test('THE ONE THAT MATTERS: an unpaid session creates no appointment', async () => {
  setEnv();
  const calls = stub({ sessionRetrieve: { payments_session: { status: 'pending', meta_data: [] } } });
  const res = await post(await load('confirm'), { payment_session_id: 'ps_1' });
  assert.equal(res.statusCode, 402);
  assert.equal(res.json().status, 'unpaid');
  assert.ok(!calls.some((c) => c.includes('/appointment')), 'the only gate held');
});

test('an UNRECOGNISED status is treated as unpaid, not as probably fine', async () => {
  setEnv();
  const calls = stub({ sessionRetrieve: { payments_session: { status: 'zoho_invented_this', meta_data: [] } } });
  const res = await post(await load('confirm'), { payment_session_id: 'ps_1' });
  assert.equal(res.statusCode, 402);
  assert.ok(!calls.some((c) => c.includes('/appointment')));
});

test('a paid session books the appointment, in the right order', async () => {
  setEnv();
  const calls = stub({ sessionRetrieve: paidSession(META) });
  const res = await post(await load('confirm'), { payment_session_id: 'ps_1' });
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(res.json().status, 'booked');
  assert.equal(res.json().booking_id, 'SI-99');

  const retrieve = calls.findIndex((c) => c.includes('GET /api/v1/paymentsessions/'));
  const markPaid = calls.findIndex((c) => c.includes('PATCH /rest/v1/slot_holds'));
  const appt = calls.findIndex((c) => c.includes('/appointment'));
  const record = calls.findIndex((c) => c.includes('record_calendar_booking'));
  assert.ok(retrieve < markPaid, 'payment verified before it is recorded');
  assert.ok(markPaid < appt, 'the durable paid record exists before the irreversible step');
  assert.ok(appt < record, 'the row is written after the appointment it describes');
});

test('the booking is built from meta_data, not from the request body', async () => {
  setEnv();
  let sent = null;
  const calls = stub({ sessionRetrieve: paidSession(META) });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u, init) => {
    if (String(u).includes('/appointment')) sent = init.body;
    return realFetch(u, init);
  };
  // A client trying to redirect the booking supplies extra fields; they are ignored.
  await post(await load('confirm'), { payment_session_id: 'ps_1', slot: '1999-01-01T00:00:00Z', staff_id: 'attacker' });
  assert.ok(sent, 'appointment was created');
  const fields = {};
  for (const [k, v] of sent.entries()) fields[k] = v;
  assert.equal(fields.staff_id, 'st_1', 'staff came from the session, not the request');
  assert.equal(fields.timezone, 'America/New_York', 'signer zone from the session');
  assert.ok(!fields.from_time.startsWith('01-Jan-1999'), 'the request could not move the slot');
  assert.ok(calls.length > 0);
});

test('polling is idempotent — a second confirm books nothing new', async () => {
  setEnv();
  const calls = stub({
    sessionRetrieve: paidSession(META),
    existingBooking: [{ booking_id: 'SI-99', scheduled_at: SLOT, session_status: 'scheduled' }],
  });
  const res = await post(await load('confirm'), { payment_session_id: 'ps_1' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().booking_id, 'SI-99');
  assert.ok(!calls.some((c) => c.includes('/appointment')), 'the appointment already existed');
  assert.ok(!calls.some((c) => c.includes('GET /api/v1/paymentsessions/')), 'and Zoho was not asked again');
});

test('paid but Book Appointment fails: reported, not silently lost', async () => {
  setEnv();
  const calls = stub({ sessionRetrieve: paidSession(META), appointmentOk: false });
  const res = await post(await load('confirm'), { payment_session_id: 'ps_1' });
  assert.equal(res.statusCode, 500);
  assert.equal(res.json().error, 'booking_failed');
  assert.match(res.json().detail, /payment went through/);
  assert.ok(calls.some((c) => c.includes('PATCH /rest/v1/slot_holds')),
    'the hold was marked paid first, so the money is recoverable');
  assert.ok(!calls.some((c) => c.includes('record_calendar_booking')), 'no row claiming an appointment that does not exist');
});

test('paid but meta_data incomplete: never guesses a slot', async () => {
  setEnv();
  const calls = stub({ sessionRetrieve: paidSession({ email: 'a@b.test' }) });
  const res = await post(await load('confirm'), { payment_session_id: 'ps_1' });
  assert.equal(res.statusCode, 500);
  assert.equal(res.json().error, 'context_lost');
  assert.ok(!calls.some((c) => c.includes('/appointment')), 'an appointment at a guessed time is worse than none');
});

test('confirm needs a session id, and refuses GET', async () => {
  setEnv();
  stub();
  assert.equal((await post(await load('confirm'), {})).statusCode, 400);
  const res = mockRes();
  await (await load('confirm'))({ method: 'GET', url: '/x', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});
