/**
 * POST /api/checkout
 *
 * Claim a slot, then open a payment session against it. This route takes money
 * but creates nothing: no Zoho appointment, no BlueNotary session. Those happen
 * in /api/confirm, after the payment has been verified server-side.
 *
 * ORDER MATTERS, and this is the order:
 *
 *   1. re-derive availability from Zoho — never trust the slot the browser sent
 *   2. claim the hold  (one atomic statement; a loser gets 409)
 *   3. create the payment session
 *   4. attach the session to the hold
 *
 * The hold is claimed BEFORE the payment session exists because a database
 * transaction cannot span an HTTP call. Claiming first means a failed session
 * call leaves an orphaned hold that expires by itself in 17 minutes. Creating
 * the session first would mean a customer paying for a slot we then discover we
 * cannot hold.
 *
 * Nothing about the request is trusted except the signer's own details. The
 * slot is re-checked against live Zoho availability, and the notary is chosen
 * here — a client-supplied staff id would be a way to book someone another
 * checkout is already holding.
 */

import { CONFIG, REQUIRED, missingEnv, resolveStaffIds, fetchStaffAvailability, paymentsPost, redact } from './_zoho.mjs';
import { missingDbEnv, liveHolds, bookedSlots, claimHold, attachSessionToHold } from './_db.mjs';
import { mergeStaffAvailability, subtractHolds, pickStaff } from '../lib/availability.mjs';
import { buildMetaData, sessionId, sessionLifetimeSeconds } from '../lib/payments.mjs';
import { isoDateInZone, assertTimeZone } from '../lib/zoho-datetime.mjs';

/** Must exceed the Zoho Payments session lifetime, measured at 900s. */
const HOLD_MINUTES = Number(process.env.SLOT_HOLD_MINUTES ?? 17);
const FEE = process.env.BOOKING_FEE_USD ?? '25.00';
const CURRENCY = process.env.BOOKING_CURRENCY ?? 'USD';
const minNotice = () => Number(process.env.BOOKING_MIN_NOTICE_MINUTES ?? 60);

/**
 * Whether a 502 carries the upstream error body back to the browser.
 *
 * Tied to BOOKING_IS_TEST on purpose: that flag already means "this is a test
 * run", so debugging is on while you are debugging and turns itself off when
 * you unset it for production. Upstream error bodies are not something a real
 * customer should ever be shown. The server-side LOG is unconditional.
 */
const DEBUG_UPSTREAM = () =>
  process.env.BOOKING_IS_TEST === 'true' || process.env.BOOKING_DEBUG_UPSTREAM === 'true';

const send = (res, status, body) => { res.statusCode = status; return res.end(JSON.stringify(body)); };

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return null; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return null;
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

/**
 * Deliberately permissive, matching the front end: the job is to catch a typo,
 * not to adjudicate RFC 5322. Anything stricter rejects real people.
 */
function validate(b) {
  const errors = {};
  const name = String(b?.name ?? '').trim();
  const email = String(b?.email ?? '').trim();
  const phone = String(b?.phone ?? '').trim();
  const slot = String(b?.slot ?? '').trim();
  const timezone = String(b?.timezone ?? '').trim();

  if (!name) errors.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Please enter an email we can send the session link to.';
  if (phone.replace(/\D/g, '').length < 10) errors.phone = 'Please enter a mobile number, including area code.';
  if (Number.isNaN(Date.parse(slot))) errors.slot = 'That appointment time was not understood.';
  try { assertTimeZone(timezone); } catch { errors.timezone = 'That time zone was not understood.'; }

  return { errors, name, email, phone, slot, timezone };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });

  // Everything missing, in one answer. Reported as one list rather than three
  // separate 503s so a single failed request tells you the whole story — and
  // logged, because a 503 whose reason exists only in the response body is
  // invisible to anyone reading Vercel's log view.
  //
  // The Supabase variables belong in this list, not behind a separate check:
  // without the database there are no holds, so two people can pay for the same
  // slot. /api/availability degrades to `source: 'zoho-no-holds'` without them
  // and keeps answering, which makes them very easy to forget.
  const missing = [
    ...missingEnv(REQUIRED.bookings),
    ...missingEnv(REQUIRED.payments),
    ...missingDbEnv(),
  ];
  if (missing.length) {
    console.error(JSON.stringify({
      severity: 'ERROR', msg: 'not_configured', route: '/api/checkout', missing,
    }));
    return send(res, 503, {
      error: 'not_configured',
      missing,
      detail: `Not configured: ${missing.join(', ')}`,
    });
  }

  const body = await readBody(req);
  const { errors, name, email, phone, slot, timezone } = validate(body);
  if (Object.keys(errors).length) return send(res, 400, { error: 'invalid', fields: errors });

  const slotIso = new Date(slot).toISOString();
  const slotMs = Date.parse(slotIso);
  if (slotMs < Date.now() + minNotice() * 60_000) {
    return send(res, 409, { error: 'too_soon', detail: 'That time is no longer bookable.' });
  }

  try {
    // --- 1. re-derive availability -----------------------------------------
    // The browser's list may be minutes old, and it is a client anyway. Ask
    // Zoho again for exactly the day in question.
    const roster = await resolveStaffIds();
    if (!roster.staff.length) return send(res, 502, { error: 'no_staff', detail: roster.error || 'No staff resolved.' });

    const orgZone = CONFIG.orgTimezone();
    const day = new Date(slotMs);
    const perStaff = {};
    await Promise.all(roster.staff.map(async (staffId) => {
      const r = await fetchStaffAvailability(staffId, day, orgZone);
      if (r.ok) perStaff[staffId] = r.instants;
    }));

    let slots = mergeStaffAvailability(perStaff).filter((s) => s.start === slotIso);
    if (!slots.length) {
      return send(res, 409, { error: 'slot_taken', detail: 'That time is no longer available.' });
    }

    const windowStart = new Date(slotMs - 60_000).toISOString();
    const windowEnd = new Date(slotMs + 60_000).toISOString();
    const [holds, sold] = await Promise.all([liveHolds(windowStart, windowEnd), bookedSlots(windowStart, windowEnd)]);
    slots = subtractHolds(slots, [...(holds || []), ...sold]);
    if (!slots.length) {
      return send(res, 409, { error: 'slot_taken', detail: 'That time was taken while you were filling this in.' });
    }

    // --- 2. claim ----------------------------------------------------------
    const staffId = pickStaff(slots[0], holds || []);
    if (!staffId) return send(res, 409, { error: 'slot_taken', detail: 'That time was taken.' });

    // The signer travels WITH the claim, in one statement, so there is never a
    // moment where a hold exists without the details /api/confirm needs.
    const [firstName, ...rest] = name.split(/\s+/);
    const hold = await claimHold(slotIso, staffId, HOLD_MINUTES, {
      email,
      first_name: firstName,
      last_name: rest.join(' '),
      phone,
      timezone,
    });
    if (!hold) {
      // Lost the race inside Postgres — someone claimed this notary for this
      // slot between the subtraction above and the insert.
      return send(res, 409, { error: 'slot_taken', detail: 'That time was taken while you were filling this in.' });
    }

    // --- 3. payment session ------------------------------------------------
    // ONE entry. Zoho caps meta_data at five and documents that PII must not
    // go in it; the first live checkout sent nine and was rejected outright.
    // Everything else about this booking is already on the hold row, written
    // by the claim above, and /api/confirm reads it back from there.
    const meta = buildMetaData({ hold_id: hold.id });

    const created = await paymentsPost('/paymentsessions', {
      amount: FEE,
      currency: CURRENCY,
      description: `Notaryous remote online notarization — ${isoDateInZone(new Date(slotMs), timezone)}`,
      meta_data: meta,
    });

    const psid = created.ok ? sessionId(created.json, created.raw) : null;
    if (!psid) {
      // Two different failures wearing the same 502, and they need different
      // fixes: Zoho refusing the request (bad scope, bad field, bad account)
      // versus Zoho accepting it and us failing to find the id in the reply.
      const rejected = !created.ok;
      const upstream = redact(created.json ?? created.raw ?? null);

      console.error(JSON.stringify({
        severity: 'ERROR',
        msg: rejected
          ? 'payment session REJECTED by Zoho'
          : 'payment session created but no id could be parsed from the response',
        route: '/api/checkout',
        zoho_status: created.status,
        zoho_body: upstream,
        // What we sent, minus the signer's details — enough to tell a rejected
        // field name from a rejected value without putting PII in a log.
        sent: { amount: FEE, currency: CURRENCY, meta_keys: meta.map((m) => m.key) },
        hold_id: hold.id,
      }));

      // The hold is left to expire on its own rather than deleted: if this was
      // a transient Zoho failure the customer will retry within seconds, and a
      // hold they already own is re-claimable by them.
      return send(res, 502, {
        error: 'payment_session_failed',
        detail: 'We could not start the payment. Nothing has been charged.',
        status: created.status,
        ...(DEBUG_UPSTREAM() ? { upstream, sent: { amount: FEE, currency: CURRENCY, meta_keys: meta.map((m) => m.key) } } : {}),
      });
    }

    await attachSessionToHold(hold.id, psid);

    // If Zoho ever shortens the session, the hold silently stops covering it.
    const lifetime = sessionLifetimeSeconds(created.json);
    if (lifetime && lifetime > HOLD_MINUTES * 60) {
      console.error(JSON.stringify({
        severity: 'ERROR',
        msg: 'payment session outlives the slot hold — raise SLOT_HOLD_MINUTES',
        lifetime_seconds: lifetime, hold_seconds: HOLD_MINUTES * 60,
      }));
    }

    return send(res, 200, {
      payment_session_id: psid,
      amount: FEE,
      currency: CURRENCY,
      slot: slotIso,
      expires_at: hold.expires_at,
      // The widget needs an account id, a publishable API key and a two-letter
      // domain. The site is static with no build step, so there is nowhere to
      // bake them in — they are served per checkout instead. All three are
      // client-side values by design; nothing secret goes over this wire.
      widget: {
        account_id: CONFIG.paymentsAccountId(),
        api_key: process.env.ZOHO_PAY_API_KEY ?? '',
        domain: process.env.ZOHO_PAY_DOMAIN ?? 'US',
      },
    });
  } catch (err) {
    // A token refresh failure lands here rather than in the branch above:
    // refreshToken() throws with Zoho's own response attached, and that message
    // is the diagnosis. Do not swallow it.
    const message = String(err?.message || err);
    console.error(JSON.stringify({
      severity: 'ERROR', msg: 'checkout threw', route: '/api/checkout', error: message,
    }));
    return send(res, 502, {
      error: 'checkout_failed',
      detail: 'We could not start the payment. Nothing has been charged.',
      ...(DEBUG_UPSTREAM() ? { threw: message } : {}),
    });
  }
}
