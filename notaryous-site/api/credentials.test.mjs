// node --test api/credentials.test.mjs
//
// Bookings and Payments share one Zoho Self Client. These pin the fallback,
// because getting it wrong fails at token refresh with an opaque Zoho error
// rather than anywhere near the cause.
import test from 'node:test';
import assert from 'node:assert/strict';

const DIR = new URL('.', import.meta.url).pathname;
const { credentialsFor, REQUIRED, missingEnv } = await import(DIR + '_zoho.mjs');

const KEYS = [
  'ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN',
  'ZOHO_PAY_CLIENT_ID', 'ZOHO_PAY_CLIENT_SECRET', 'ZOHO_PAY_REFRESH_TOKEN',
  'ZOHO_PAY_ACCOUNT_ID',
];
const setEnv = (o = {}) => {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, o);
};

const SHARED = {
  ZOHO_CLIENT_ID: 'shared-id',
  ZOHO_CLIENT_SECRET: 'shared-secret',
  ZOHO_REFRESH_TOKEN: 'bookings-refresh',
  ZOHO_PAY_REFRESH_TOKEN: 'payments-refresh',
  ZOHO_PAY_ACCOUNT_ID: 'acct_1',
};

test('payments borrows the Bookings client id and secret', () => {
  setEnv(SHARED);
  assert.deepEqual(credentialsFor('payments'), {
    refresh_token: 'payments-refresh',
    client_id: 'shared-id',
    client_secret: 'shared-secret',
  });
});

test('the two products use DIFFERENT refresh tokens', () => {
  setEnv(SHARED);
  const bookings = credentialsFor('bookings');
  const payments = credentialsFor('payments');
  assert.equal(bookings.refresh_token, 'bookings-refresh');
  assert.equal(payments.refresh_token, 'payments-refresh');
  assert.notEqual(bookings.refresh_token, payments.refresh_token,
    'two authorization codes, two tokens — sharing one would drop half the scopes');
  assert.equal(bookings.client_id, payments.client_id, 'but one Self Client');
});

test('ZOHO_PAY_CLIENT_ID/SECRET win when set, so the clients can be split later', () => {
  setEnv({ ...SHARED, ZOHO_PAY_CLIENT_ID: 'own-id', ZOHO_PAY_CLIENT_SECRET: 'own-secret' });
  const c = credentialsFor('payments');
  assert.equal(c.client_id, 'own-id');
  assert.equal(c.client_secret, 'own-secret');
  // and Bookings is unaffected
  assert.equal(credentialsFor('bookings').client_id, 'shared-id');
});

test('bookings never borrows the payments credentials', () => {
  setEnv({ ZOHO_PAY_CLIENT_ID: 'p', ZOHO_PAY_CLIENT_SECRET: 'p', ZOHO_PAY_REFRESH_TOKEN: 'p' });
  const c = credentialsFor('bookings');
  assert.equal(c.client_id, undefined);
  assert.equal(c.refresh_token, undefined, 'the fallback is one-directional');
});

test('REQUIRED.payments no longer demands duplicated client credentials', () => {
  setEnv(SHARED);
  assert.deepEqual(missingEnv(REQUIRED.payments), [],
    'shared client + pay-specific token and account is a complete configuration');
  assert.deepEqual(missingEnv(REQUIRED.bookings).filter((n) => n !== 'ZOHO_SERVICE_ID'), []);
});

test('a missing shared credential is reported naming both accepted variables', () => {
  setEnv({ ZOHO_PAY_REFRESH_TOKEN: 'r', ZOHO_PAY_ACCOUNT_ID: 'a' });
  const miss = missingEnv(REQUIRED.payments);
  assert.deepEqual(miss, [
    'ZOHO_PAY_CLIENT_ID or ZOHO_CLIENT_ID',
    'ZOHO_PAY_CLIENT_SECRET or ZOHO_CLIENT_SECRET',
  ]);
});

test('the Payments-specific variables are still individually required', () => {
  setEnv({ ZOHO_CLIENT_ID: 'x', ZOHO_CLIENT_SECRET: 'y' });
  assert.deepEqual(missingEnv(REQUIRED.payments), ['ZOHO_PAY_REFRESH_TOKEN', 'ZOHO_PAY_ACCOUNT_ID']);
});

test('missingEnv still handles a plain list of strings', () => {
  setEnv({ ZOHO_CLIENT_ID: 'x' });
  assert.deepEqual(missingEnv(['ZOHO_CLIENT_ID', 'NOT_SET_ANYWHERE']), ['NOT_SET_ANYWHERE']);
  assert.deepEqual(missingEnv([]), []);
});
