// node --test api/alert.test.mjs
//
// The alert helper runs on the money path. What matters is not that it sends —
// it is that it can NEVER change the outcome of a booking. Every test here is
// a variation on "this must not throw".
import test from 'node:test';
import assert from 'node:assert/strict';
import { alertOps } from './_alert.mjs';

const withEnv = async (value, fn) => {
  const prev = process.env.OPS_SLACK_WEBHOOK_URL;
  if (value === undefined) delete process.env.OPS_SLACK_WEBHOOK_URL;
  else process.env.OPS_SLACK_WEBHOOK_URL = value;
  try { return await fn(); }
  finally {
    if (prev === undefined) delete process.env.OPS_SLACK_WEBHOOK_URL;
    else process.env.OPS_SLACK_WEBHOOK_URL = prev;
  }
};

/** Silence the structured log so a passing run is readable. */
const quiet = async (fn) => {
  const real = console.error;
  console.error = () => {};
  try { return await fn(); } finally { console.error = real; }
};

const withFetch = async (impl, fn) => {
  const real = globalThis.fetch;
  globalThis.fetch = impl;
  try { return await fn(); } finally { globalThis.fetch = real; }
};

test('with no webhook configured it logs and reports why, without throwing', async () => {
  await withEnv(undefined, () => quiet(async () => {
    const r = await alertOps('paid but not booked', { email: 'a@b.com' });
    assert.deepEqual(r, { sent: false, reason: 'no_webhook_configured' });
  }));
});

test('the structured log is written even when Slack is not configured', async () => {
  await withEnv(undefined, async () => {
    const real = console.error;
    const lines = [];
    console.error = (l) => lines.push(l);
    try { await alertOps('subject here', { hold_id: 'h1' }); }
    finally { console.error = real; }
    assert.equal(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.severity, 'ERROR');
    assert.equal(entry.alert, 'subject here');
    assert.equal(entry.hold_id, 'h1');
    assert.ok(entry.at, 'carries a timestamp so the log is orderable');
  });
});

test('posts subject and details to the webhook when configured', async () => {
  let seen = null;
  await withEnv('https://hooks.example.com/x', () => quiet(() =>
    withFetch(async (url, init) => { seen = { url, init }; return { ok: true, status: 200 }; }, async () => {
      const r = await alertOps('PAID BUT NOT BOOKED — call this customer', {
        email: 'peggy@example.com', phone: '555', payment_id: '99',
      });
      assert.deepEqual(r, { sent: true });
    })));
  assert.equal(seen.url, 'https://hooks.example.com/x');
  assert.equal(seen.init.method, 'POST');
  const body = JSON.parse(seen.init.body);
  assert.match(body.text, /PAID BUT NOT BOOKED/);
  assert.match(body.text, /peggy@example\.com/, 'ops must be able to act without opening the database');
  assert.match(body.text, /99/);
});

test('a rejecting webhook does not throw', async () => {
  await withEnv('https://hooks.example.com/x', () => quiet(() =>
    withFetch(async () => ({ ok: false, status: 404 }), async () => {
      const r = await alertOps('s', {});
      assert.deepEqual(r, { sent: false, reason: 'http_404' });
    })));
});

test('a throwing or hanging webhook does not throw — a booking must not fail because Slack did', async () => {
  await withEnv('https://hooks.example.com/x', () => quiet(() =>
    withFetch(async () => { throw new Error('ECONNRESET'); }, async () => {
      const r = await alertOps('s', {});
      assert.deepEqual(r, { sent: false, reason: 'threw' });
    })));
});

test('details that cannot be serialised do not throw', async () => {
  const circular = {};
  circular.self = circular;
  await withEnv(undefined, () => quiet(async () => {
    await assert.doesNotReject(() => alertOps('s', circular));
  }));
});
