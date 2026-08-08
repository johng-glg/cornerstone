/**
 * TEMPORARY — step 0 token exchange. Delete with the rest of /step0.
 *
 * Trades a Zoho Self Client authorization code for a refresh token. This runs
 * BEFORE the four checks, because until it does there is no refresh token for
 * anything else to use.
 *
 * Persists nothing. No database write, no log line, no console output. The code,
 * the client id and the client secret exist only for the lifetime of the request
 * — they arrive in the body, go straight to Zoho, and are never referenced again.
 * Even the error path returns Zoho's own message rather than echoing the input.
 */

import { tokenMatches, redact } from './_zoho.mjs';

const DEFAULT_ACCOUNTS_HOST = 'https://accounts.zoho.com';

/** Zoho accounts hosts, by data centre. Anything else is rejected. */
const ALLOWED_ACCOUNTS_HOSTS = new Set([
  'accounts.zoho.com',      // US
  'accounts.zoho.eu',       // EU
  'accounts.zoho.in',       // India
  'accounts.zoho.com.au',   // Australia
  'accounts.zoho.jp',       // Japan
  'accounts.zohocloud.ca',  // Canada
  'accounts.zoho.sa',       // Saudi Arabia
  'accounts.zoho.uk',       // UK
]);

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;   // Vercel pre-parses
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  const fail = (status, answer, detail, extra = {}) => {
    res.statusCode = status;
    return res.end(JSON.stringify({ answer, detail, ...extra }, null, 2));
  };

  if (req.method !== 'POST') return fail(405, 'Method not allowed', 'This endpoint takes POST only.');

  const expected = process.env.STEP0_TOKEN;
  if (!expected) {
    return fail(503, 'Disabled',
      'STEP0_TOKEN is not set. Set it in the Vercel project to enable the step 0 routes, and unset it ' +
      'the moment the refresh tokens are in place.');
  }
  if (!tokenMatches(String(req.headers['x-step0-token'] || ''), expected)) {
    return fail(401, 'Unauthorized', 'Bad or missing step 0 token.');
  }

  let body;
  try { body = await readJsonBody(req); }
  catch { return fail(400, 'Bad request', 'Body must be JSON.'); }

  const code = String(body.code || '').trim();
  const clientId = String(body.clientId || '').trim();
  const clientSecret = String(body.clientSecret || '').trim();
  const accountsHost = String(body.accountsHost || DEFAULT_ACCOUNTS_HOST).trim().replace(/\/+$/, '');

  const missing = [
    !code && 'authorization code',
    !clientId && 'client ID',
    !clientSecret && 'client secret',
  ].filter(Boolean);
  if (missing.length) {
    return fail(400, 'Missing fields', `Fill in the ${missing.join(', ')} before exchanging.`);
  }

  // The host is attacker-controllable from the browser, and the request carries
  // a client secret. Without this check, a crafted body would post the firm's
  // Zoho credentials to any origin of the caller's choosing.
  let host;
  try { host = new URL(accountsHost); } catch { return fail(400, 'Bad accounts host', `"${accountsHost}" is not a URL.`); }
  if (host.protocol !== 'https:' || !ALLOWED_ACCOUNTS_HOSTS.has(host.hostname)) {
    return fail(400, 'Refused',
      `"${host.hostname}" is not a Zoho accounts host. This request carries a client secret, so it only ` +
      `goes to a known Zoho data centre. Allowed: ${[...ALLOWED_ACCOUNTS_HOSTS].join(', ')}.`);
  }

  // Self Client: no redirect_uri. Sending one is what produces invalid_client.
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
  });

  let zres, text;
  try {
    zres = await fetch(`${host.origin}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    text = await zres.text();
  } catch (err) {
    return fail(502, 'Could not reach Zoho',
      `The request to ${host.origin} failed: ${String(err && err.message ? err.message : err)}`);
  }

  let json;
  try { json = JSON.parse(text); }
  catch {
    return fail(502, 'Zoho returned something that is not JSON',
      `HTTP ${zres.status}. First 300 characters follow.`, { raw: text.slice(0, 300) });
  }

  // Zoho's OAuth endpoint answers HTTP 200 with an `error` field on failure.
  // Trusting res.ok alone would report success for an expired code.
  if (json.error) {
    const hint = json.error === 'invalid_code'
      ? 'invalid_code almost always means the code expired. It is valid for a couple of minutes — generate a ' +
        'fresh one in the API Console and exchange it immediately, without stopping to copy anything else.'
      : json.error === 'invalid_client'
      ? 'invalid_client usually means the client ID or secret has a stray space, or that a redirect_uri was sent. ' +
        'A Self Client must not send one, and this endpoint does not.'
      : json.error === 'invalid_scope' || /scope/i.test(String(json.error))
      ? 'The scope string was rejected. Bookings and Payments scopes may not be combinable — if so, generate two ' +
        'separate codes from the same client credentials and exchange each one here.'
      : 'Zoho\'s error is shown verbatim above.';
    return fail(400, `Zoho rejected the exchange: ${json.error}`, hint, { raw: redact(json) });
  }

  if (!json.refresh_token) {
    return fail(400, 'No refresh token in the response',
      json.access_token
        ? 'Zoho returned an access token but no refresh token. That happens when the grant was not generated for ' +
          'offline access — in the API Console, the generated code must be for a Self Client with a duration set. ' +
          'An access token alone expires in an hour and is no use to a deployed service.'
        : 'The response carried neither a refresh token nor an access token.',
      { raw: redact(json) });
  }

  // Only these four fields go back. The access token is deliberately dropped —
  // it is short-lived, the service mints its own, and it has no business in a
  // browser. The scrubber would strip refresh_token, which is the one value
  // this endpoint exists to produce, so it is explicitly allowed here and here
  // only; access_token stays on the block list.
  const payload = redact({
    refresh_token: json.refresh_token,
    api_domain: json.api_domain || null,
    scope: json.scope || null,
    expires_in: json.expires_in ?? null,
  }, { allow: ['refresh_token'] });

  res.statusCode = 200;
  return res.end(JSON.stringify({
    answer: 'Refresh token issued',
    detail: 'Copy the block below into the Vercel project environment variables, then close this tab. ' +
            'The refresh token is long-lived — treat it exactly like a password.' +
            (payload.api_domain
              ? ` Zoho reports your data centre as ${payload.api_domain}; that becomes ZOHO_API_DOMAIN and is what ` +
                'every API call is built on, so no region host is ever hardcoded.'
              : ' Zoho did not return an api_domain, so ZOHO_API_DOMAIN is left unset and the default US host applies.'),
    ...payload,
  }, null, 2));
}
