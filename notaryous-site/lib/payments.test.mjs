// node --test lib/payments.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMetaData, parseMetaData, sessionPayment, sessionId,
  sessionLifetimeSeconds, unwrapSession,
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
