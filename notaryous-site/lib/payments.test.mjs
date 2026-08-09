// node --test lib/payments.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMetaData, parseMetaData, sessionPayment, sessionId,
  sessionLifetimeSeconds, unwrapSession, exactId,
} from './payments.mjs';

// The real create response's timings, from the step 0 check.
const CREATED = 1786227520;
const EXPIRY = 1786228420;

const session = (extra = {}) => ({
  payments_session: {
    payments_session_id: 'ps_abc', amount: '25.00', currency: 'USD',
    created_time: CREATED, expiry_time: EXPIRY, max_retry_count: 5,
    meta_data: [], ...extra,
  },
});

test('THE ONE THAT MATTERS: an unrecognised status is NOT paid', () => {
  // There is no second gate. The orchestration service treats anything that
  // reaches it as paid, so a status we cannot read must fail closed here.
  const out = sessionPayment(session({ status: 'some_new_zoho_status' }));
  assert.equal(out.paid, false);
  assert.equal(out.known, false, 'and it is flagged as unrecognised, not silently unpaid');
});

test('only genuinely-paid statuses open the gate', () => {
  for (const s of ['succeeded', 'success', 'paid', 'captured', 'completed', 'SUCCEEDED']) {
    assert.equal(sessionPayment(session({ status: s })).paid, true, s);
  }
  for (const s of ['pending', 'initiated', 'created', 'failed', 'canceled', 'cancelled', 'expired', 'processing']) {
    const out = sessionPayment(session({ status: s }));
    assert.equal(out.paid, false, s);
    assert.equal(out.known, true, `${s} is a known non-paid status, not an unknown one`);
  }
});

test('a paid attempt inside payments[] counts, and yields the payment id', () => {
  const out = sessionPayment(session({
    status: 'pending',
    payments: [{ payment_id: 'pay_1', status: 'failed' }, { payment_id: 'pay_2', status: 'succeeded' }],
  }));
  assert.equal(out.paid, true, 'a retry succeeded even though the session still reads pending');
  assert.equal(out.paymentId, 'pay_2', 'the id of the attempt that actually succeeded');
});

test('failed attempts alone are not paid', () => {
  const out = sessionPayment(session({ status: 'pending', payments: [{ payment_id: 'p', status: 'failed' }] }));
  assert.equal(out.paid, false);
  assert.equal(out.paymentId, null);
});

test('no session, junk, or a missing status is not paid', () => {
  for (const j of [null, undefined, 'nope', 42, {}, { payments_session: {} }]) {
    assert.equal(sessionPayment(j).paid, false, String(j));
  }
});

test('epoch seconds are read as seconds, not milliseconds', () => {
  const out = sessionPayment(session({ status: 'succeeded' }));
  assert.equal(out.createdAt, new Date(CREATED * 1000).toISOString());
  assert.equal(out.expiresAt, new Date(EXPIRY * 1000).toISOString());
  assert.ok(out.createdAt.startsWith('20'), 'treating these as ms would date to 1970');
});

test('the measured session lifetime is 900 seconds', () => {
  assert.equal(sessionLifetimeSeconds(session()), 900);
  assert.equal(sessionLifetimeSeconds(session({ expiry_time: CREATED })), null, 'zero-length is not a lifetime');
  assert.equal(sessionLifetimeSeconds({}), null);
});

test('the hold outlives the session — the whole point of the 17 minutes', () => {
  const HOLD_SECONDS = 17 * 60;
  assert.ok(HOLD_SECONDS > sessionLifetimeSeconds(session()),
    'a hold shorter than the session lets a paying customer lose their slot');
});

test('meta_data round-trips through the array shape', () => {
  const ctx = { slot: '2026-09-01T17:00:00.000Z', staff_id: 'st_1', email: 'a@b.test' };
  const built = buildMetaData(ctx);
  assert.deepEqual(built, [
    { key: 'slot', value: '2026-09-01T17:00:00.000Z' },
    { key: 'staff_id', value: 'st_1' },
    { key: 'email', value: 'a@b.test' },
  ]);
  assert.deepEqual(parseMetaData(session({ meta_data: built })), ctx);
});

test('buildMetaData drops empties and stringifies, so nothing arrives as null', () => {
  assert.deepEqual(buildMetaData({ a: 1, b: true, c: null, d: undefined, e: '' }),
    [{ key: 'a', value: '1' }, { key: 'b', value: 'true' }]);
  assert.deepEqual(buildMetaData(null), []);
});

test('parseMetaData tolerates the alternate element keys and a flat object', () => {
  assert.deepEqual(parseMetaData(session({ meta_data: [{ name: 'slot', value: 'x' }] })), { slot: 'x' });
  assert.deepEqual(parseMetaData(session({ meta_data: [{ label: 'slot', value: 'x' }] })), { slot: 'x' });
  assert.deepEqual(parseMetaData(session({ meta_data: { slot: 'x' } })), { slot: 'x' });
  assert.deepEqual(parseMetaData(session({ meta_data: null })), {});
  assert.deepEqual(parseMetaData(null), {});
});

test('parseMetaData ignores entries with no key rather than inventing one', () => {
  assert.deepEqual(parseMetaData(session({ meta_data: [{ value: 'orphan' }, null, 'x', { key: 'ok', value: '1' }] })),
    { ok: '1' });
});

test('session id is found in each documented envelope', () => {
  assert.equal(sessionId(session()), 'ps_abc');
  assert.equal(sessionId({ payment_session: { payment_session_id: 'ps_2' } }), 'ps_2');
  assert.equal(sessionId({ data: { id: 'ps_3' } }), 'ps_3');
  assert.equal(sessionId({ payments_session_id: 'ps_4' }), 'ps_4');
  assert.equal(sessionId({}), null);
  assert.equal(sessionId(null), null);
});

test('unwrapSession does not mistake a bare envelope for a session', () => {
  assert.equal(unwrapSession(null), null);
  assert.equal(unwrapSession('x'), null);
  assert.deepEqual(unwrapSession({ payments_session: { a: 1 } }), { a: 1 });
});

// ── large ids ──────────────────────────────────────────────────────────────

test('THE MONEY ONE: a payment id past 2^53 survives JSON.parse rounding', () => {
  // Real ids from the first live checkout. 22684000000151089 is NOT safely
  // representable — parsed as a JSON number it becomes ...090, and a refund
  // against that id refunds nothing, or refunds the wrong charge.
  const exact = '22684000000151089';
  assert.equal(Number.isSafeInteger(Number(exact)), false, 'this is genuinely past 2^53');
  assert.notEqual(String(JSON.parse(`{"payment_id":${exact}}`).payment_id), exact,
    'JSON.parse really does round it');

  const raw = `{"payments_session":{"status":"succeeded","payment_id":${exact}}}`;
  const out = sessionPayment(JSON.parse(raw), raw);
  assert.equal(out.paid, true);
  assert.equal(out.paymentId, exact, 'the exact digits are recovered from the raw body');
});

test('a quoted id needs no recovery and is returned as-is', () => {
  const exact = '22684000000151089';
  const raw = `{"payments_session":{"status":"succeeded","payment_id":"${exact}"}}`;
  assert.equal(sessionPayment(JSON.parse(raw), raw).paymentId, exact);
});

test('session ids get the same protection', () => {
  const exact = '22684000000150064';
  const raw = `{"payments_session":{"payments_session_id":${exact}}}`;
  assert.equal(sessionId(JSON.parse(raw), raw), exact);
  assert.equal(sessionId({ payments_session: { payments_session_id: exact } }), exact);
});

test('exactId leaves safe values, strings and nulls alone', () => {
  assert.equal(exactId(42, '{"x":42}', 'x'), '42');
  assert.equal(exactId('ps_abc', null, 'x'), 'ps_abc');
  assert.equal(exactId(null, null, 'x'), null);
  assert.equal(exactId(undefined, null, 'x'), null);
});

test('an unrecoverable rounded id is reported rather than passed off as exact', () => {
  const lines = [];
  const real = console.error;
  console.error = (m) => lines.push(String(m));
  try { exactId(22684000000151089, null, 'payment_id'); } finally { console.error = real; }
  const logged = lines.map((l) => { try { return JSON.parse(l); } catch { return {}; } })
    .find((o) => /unsafe JSON number/.test(o.msg || ''));
  assert.ok(logged, 'silence here is how the wrong person gets their money back');
});
