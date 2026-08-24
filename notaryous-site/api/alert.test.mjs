// node --test api/alert.test.mjs
//
// The alert helper runs on the money path. What matters is not that it sends —
// it is that it can NEVER change the outcome of a booking. Most of these are a
// variation on "this must not throw".
import test from 'node:test';
import assert from 'node:assert/strict';
import { alertOps } from './_alert.mjs';

const ENV = ['ZEPTOMAIL_TOKEN', 'ALERT_FROM', 'ALERT_TO', 'ZEPTOMAIL_HOST'];

const withEnv = async (vals, fn) => {
  const prev = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
  for (const k of ENV) delete process.env[k];
  for (const [k, v] of Object.entries(vals)) process.env[k] = v;
  try { return await fn(); }
  finally {
    for (const k of ENV) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
};

const CONFIGURED = {
  ZEPTOMAIL_TOKEN: 'testkey',
  ALERT_FROM: 'alerts@notaryous.com',
  ALERT_TO: 'john@guardianlit.com, ops@guardianlit.com',
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

const capture = async (fn) => {
  const real = console.error;
  const lines = [];
  console.error = (l) => lines.push(l);
  try { await fn(); } finally { console.error = real; }
  return lines;
};

test('unconfigured: logs, reports why, does not throw', async () => {
  await withEnv({}, () => quiet(async () => {
    const r = await alertOps('paid but not booked', { email: 'a@b.com' });
    assert.deepEqual(r, { sent: false, reason: 'alert_email_not_configured' });
  }));
});

test('the structured log is written even when mail is not configured', async () => {
  const lines = await withEnv({}, () => capture(() => alertOps('subject here', { hold_id: 'h1' })));
  assert.equal(lines.length, 1);
  const entry = JSON.parse(lines[0]);
  assert.equal(entry.severity, 'ERROR');
  assert.equal(entry.alert, 'subject here');
  assert.equal(entry.hold_id, 'h1');
  assert.ok(entry.at, 'carries a timestamp so the log is orderable');
});

test('a partial configuration does not half-send', async () => {
  await withEnv({ ZEPTOMAIL_TOKEN: 'k', ALERT_FROM: 'a@b.com' }, () => quiet(async () => {
    const r = await alertOps('s', {});           // ALERT_TO missing
    assert.deepEqual(r, { sent: false, reason: 'alert_email_not_configured' });
  }));
});

test('sends a ZeptoMail request an operator can act on', async () => {
  let seen = null;
  await withEnv(CONFIGURED, () => quiet(() =>
    withFetch(async (url, init) => { seen = { url, init }; return { ok: true, status: 201 }; }, async () => {
      const r = await alertOps('PAID BUT NOT BOOKED — call this customer', {
        customer: 'Peggy Carey', email: 'peggy@example.com', phone: '262 417 5158',
        payment_id: '22684000000168381',
        action: 'Book by hand in Zoho, or refund. The card HAS been charged.',
      });
      assert.deepEqual(r, { sent: true });
    })));

  assert.equal(seen.url, 'https://api.zeptomail.com/v1.1/email');
  assert.equal(seen.init.method, 'POST');
  assert.match(seen.init.headers.authorization, /^Zoho-enczapikey testkey$/);

  const body = JSON.parse(seen.init.body);
  assert.equal(body.from.address, 'alerts@notaryous.com');
  assert.deepEqual(body.to.map((t) => t.email_address.address),
    ['john@guardianlit.com', 'ops@guardianlit.com'], 'comma list splits and trims');
  assert.match(body.subject, /PAID BUT NOT BOOKED/);
  assert.match(body.subject, /Peggy Carey/, 'actionable from a lock screen');
  assert.match(body.textbody, /262 417 5158/, 'the phone number is the point');
  assert.match(body.textbody, /WHAT TO DO — Book by hand/);
  assert.match(body.htmlbody, /peggy@example\.com/);
});

test('a bare key is accepted as well as a full Zoho-enczapikey header', async () => {
  let auth = null;
  await withEnv({ ...CONFIGURED, ZEPTOMAIL_TOKEN: 'Zoho-enczapikey abc123' }, () => quiet(() =>
    withFetch(async (_u, init) => { auth = init.headers.authorization; return { ok: true, status: 201 }; },
      () => alertOps('s', {}))));
  assert.equal(auth, 'Zoho-enczapikey abc123', 'not double-prefixed');
});

test('ZEPTOMAIL_HOST overrides the region', async () => {
  let url = null;
  await withEnv({ ...CONFIGURED, ZEPTOMAIL_HOST: 'https://api.zeptomail.eu/' }, () => quiet(() =>
    withFetch(async (u) => { url = u; return { ok: true, status: 201 }; }, () => alertOps('s', {}))));
  assert.equal(url, 'https://api.zeptomail.eu/v1.1/email', 'trailing slash trimmed');
});

test('a rejected send is logged with the reason and does not throw', async () => {
  const lines = await withEnv(CONFIGURED, () =>
    withFetch(async () => ({ ok: false, status: 401, text: async () => 'invalid sendmail token' }),
      () => capture(() => alertOps('s', {}))));
  const rejection = lines.map((l) => JSON.parse(l)).find((e) => e.alert === 'ops_alert_rejected');
  assert.equal(rejection.status, 401);
  assert.match(rejection.detail, /invalid sendmail token/,
    'a silently undelivered alert is this whole problem happening twice');
});

test('a throwing or hanging mail API does not throw — a booking must not fail because email did', async () => {
  await withEnv(CONFIGURED, () => quiet(() =>
    withFetch(async () => { throw new Error('ETIMEDOUT'); }, async () => {
      const r = await alertOps('s', {});
      assert.deepEqual(r, { sent: false, reason: 'threw' });
    })));
});

test('details that cannot be serialised do not throw', async () => {
  const circular = {};
  circular.self = circular;
  await withEnv({}, () => quiet(async () => {
    await assert.doesNotReject(() => alertOps('s', circular));
  }));
});

test('html output is escaped', async () => {
  let body = null;
  await withEnv(CONFIGURED, () => quiet(() =>
    withFetch(async (_u, init) => { body = JSON.parse(init.body); return { ok: true, status: 201 }; },
      () => alertOps('s', { note: '<script>alert(1)</script>' }))));
  assert.match(body.htmlbody, /&lt;script&gt;/);
  assert.doesNotMatch(body.htmlbody, /<script>/);
});
