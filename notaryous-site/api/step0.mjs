/**
 * TEMPORARY — step 0 diagnostic. Delete this file, api/_zoho.mjs's step-0-only
 * bits, step0.html and the vercel.json header once the four answers are in
 * docs/booking-calendar.md. See the deletion checklist in that file.
 *
 * Answers the four questions the build cannot answer without Zoho credentials
 * and egress. Every check runs server-side; the browser only ever sees the
 * result and a redacted copy of the raw response.
 *
 * ACCESS: gated on STEP0_TOKEN. noindex is not access control, and this route
 * creates real appointments on a real notary's calendar.
 */

import {
  CONFIG, REQUIRED, missingEnv, bookingsGet, bookingsPostForm,
  paymentsPost, paymentsGet, tokenMatches, redact, resolveStaffIds,
} from './_zoho.mjs';
import { zohoFromTime, zohoDate } from '../lib/zoho-datetime.mjs';
import { parseBookingId } from '../lib/zoho-bookings.mjs';

const TEST_CUSTOMER = {
  name: 'STEP0 TEST — do not attend',
  email: process.env.STEP0_TEST_EMAIL || 'step0-test@guardianlit.com',
  phone_number: '7146942423',
};

/** Two business days out at 11:00 local, far enough not to collide with a real booking. */
function probeInstant() {
  const d = new Date(Date.now() + 2 * 86400000);
  d.setUTCHours(19, 0, 0, 0);           // 19:00Z ≈ 11:00 Pacific
  const dow = d.getUTCDay();
  if (dow === 6) d.setUTCDate(d.getUTCDate() + 2);
  if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

const ok = (answer, detail, raw, extra = {}) => ({ answer, detail, raw: redact(raw), ...extra });

/**
 * Which notary the probes book against.
 *
 * ZOHO_STAFF_ID is honoured if set — that is now its only job, pinning these
 * probes to one known record so a test appointment always lands on the same
 * calendar. Unset, this resolves the service's roster the same way
 * /api/availability does, which means the checks exercise the production path
 * rather than a configuration that production no longer uses.
 */
async function probeStaff() {
  const roster = await resolveStaffIds();
  if (!roster.staff.length) {
    return { id: null, error: roster.error || 'No staff could be resolved for this service.', roster };
  }
  return { id: roster.staff[0], roster };
}

/** Same shape for every check that cannot get a notary to book against. */
const noStaff = (staff) => ok('Cannot run — no staff resolved',
  `${staff.error} ZOHO_SERVICE_ID must name a service with at least one staff record assigned. ` +
  'Set ZOHO_STAFF_ID to pin these probes to one notary if you would rather not depend on discovery here — ' +
  'it is an override for this page only, and production ignores it.',
  staff.roster?.raw ?? null);

/** The line every booking check prints, so it is never a mystery who was booked. */
const bookedAs = (staff) =>
  `Booked against staff ${staff.id} (${staff.roster.source === 'env' ? 'pinned by ZOHO_STAFF_ID' : 'first of ' + staff.roster.staff.length + ' resolved from the service'}). `;

// ---------------------------------------------------------------------------
// Q1 — does the BlueNotary Flow fire on an API-created appointment?
// ---------------------------------------------------------------------------
async function checkFlow() {
  const miss = missingEnv(REQUIRED.bookings);
  if (miss.length) return ok('Cannot run', `Missing environment variables: ${miss.join(', ')}`, null);

  const staff = await probeStaff();
  if (!staff.id) return noStaff(staff);

  const when = probeInstant();
  const from_time = zohoFromTime(when, CONFIG.orgTimezone());
  const res = await bookingsPostForm('/appointment', {
    service_id: CONFIG.serviceId(),
    staff_id: staff.id,
    from_time,
    timezone: CONFIG.orgTimezone(),
    customer_details: TEST_CUSTOMER,
    payment_info: { cost_paid: '0.00' },
    notes: 'STEP0 diagnostic — created by /api/step0, safe to cancel',
  });

  const bookingId = parseBookingId(res.json);

  if (!res.ok || !bookingId) {
    return ok('FAILED — no appointment was created',
      `Book Appointment returned HTTP ${res.status}. Nothing was booked, so there is nothing to cancel. ` +
      `${bookedAs(staff)}Check service_id, the OAuth scope zohobookings.data.CREATE, and that from_time ` +
      `matches the dd-MMM-yyyy HH:mm:ss format — we sent "${from_time}".`,
      res.json ?? res.raw,
      { bookingId: null, staff: staff.id, sent: { from_time, timezone: CONFIG.orgTimezone() } });
  }

  return ok('Appointment created — now check BlueNotary by hand',
    `Booking ${bookingId} was created for ${from_time} (${CONFIG.orgTimezone()}). ${bookedAs(staff)}` +
    'This service has no BlueNotary access, so it cannot confirm the Flow fired — open BlueNotary and look ' +
    `for a session against this appointment. If one exists, Flow fires on API-created appointments and the ` +
    'build proceeds unchanged. If not, the payment confirmation handler must call the Flow webhook itself. ' +
    'Either way, cancel this booking below when you are done.',
    res.json, { bookingId, staff: staff.id, sent: { from_time, timezone: CONFIG.orgTimezone() } });
}

// ---------------------------------------------------------------------------
// Roster — who can actually take this service?
// ---------------------------------------------------------------------------
// Not one of the four questions, but the one that has to be right before any of
// them mean anything: production discovers staff instead of reading
// ZOHO_STAFF_ID, and if discovery returns nothing the calendar is empty for
// reasons that look exactly like "no availability".
async function checkStaff() {
  const miss = missingEnv(REQUIRED.bookings);
  if (miss.length) return ok('Cannot run', `Missing environment variables: ${miss.join(', ')}`, null);

  const roster = await resolveStaffIds({ force: true });
  if (!roster.staff.length) {
    return ok('FAILED — no staff resolved',
      `${roster.error} Until this returns at least one staff id, /api/availability answers 502 rather than ` +
      'publishing an empty fortnight. Check that ZOHO_SERVICE_ID is the RON service and that staff are ' +
      `assigned to it. The endpoint tried was ${CONFIG.staffPath()}?service_id=… — if Zoho names it something ` +
      'else on this account, set ZOHO_STAFF_PATH rather than editing code.',
      roster.raw ?? null, { staff: [] });
  }
  const pinned = roster.source === 'env';
  return ok(
    pinned ? `Pinned to ${roster.staff.length} staff by ZOHO_STAFF_ID` : `${roster.staff.length} staff resolved from the service`,
    pinned
      ? `ZOHO_STAFF_ID is set to "${CONFIG.staffId()}", so discovery was skipped. That override exists for this ` +
        'page only — /api/availability and /api/checkout ignore nothing, but production should run with it unset ' +
        'so a notary joining or leaving needs no deploy. Unset it and run this check again to confirm discovery works.'
      : 'Availability will be the union of these diaries, and checkout picks between whoever is free at the ' +
        'chosen time. Confirm the list matches the notaries who should be taking RON appointments — an extra ' +
        'name here means someone gets booked who did not expect it.',
    roster.raw ?? null, { staff: roster.staff, source: roster.source });
}

// ---------------------------------------------------------------------------
// Q2 — what zone does Zoho read from_time in?  (fully machine-answerable)
// ---------------------------------------------------------------------------
async function checkTimezone() {
  const miss = missingEnv(REQUIRED.bookings);
  if (miss.length) return ok('Cannot run', `Missing environment variables: ${miss.join(', ')}`, null);

  // Book at 11:00 wall-clock while DECLARING a non-org zone. If Zoho honours
  // the timezone field, 11:00 Eastern is 08:00 Pacific. If it ignores it and
  // reads the org zone, the appointment lands at 11:00 Pacific.
  const staff = await probeStaff();
  if (!staff.id) return noStaff(staff);

  const probeZone = CONFIG.orgTimezone() === 'America/New_York' ? 'America/Chicago' : 'America/New_York';
  const when = probeInstant();
  const from_time = `${zohoDate(when, probeZone)} 11:00:00`;

  const created = await bookingsPostForm('/appointment', {
    service_id: CONFIG.serviceId(),
    staff_id: staff.id,
    from_time,
    timezone: probeZone,
    customer_details: { ...TEST_CUSTOMER, name: 'STEP0 TZ TEST — do not attend' },
    payment_info: { cost_paid: '0.00' },
    notes: 'STEP0 timezone probe — created by /api/step0, safe to cancel',
  });

  const bookingId = parseBookingId(created.json);
  if (!created.ok || !bookingId) {
    return ok('Cannot run — the probe booking failed',
      `Book Appointment returned HTTP ${created.status}. Run the Flow check first; it reports the same error in more detail.`,
      created.json ?? created.raw, { bookingId: null });
  }

  const read = await bookingsGet('/getappointment', { booking_id: bookingId });
  const got = read.json?.response?.returnvalue ?? read.json?.data ?? {};
  const start = got.start_time ?? got.from_time ?? null;
  const customerStart = got.customer_booking_start_time ?? got.customer_start_time ?? null;

  let answer = 'Inconclusive — compare the two times by hand';
  let detail =
    `We sent from_time "${from_time}" with timezone "${probeZone}" while the org zone is ` +
    `"${CONFIG.orgTimezone()}". Zoho read it back as start_time "${start}" and ` +
    `customer_booking_start_time "${customerStart}". `;

  if (start && customerStart) {
    const sameWallClock = String(start).slice(0, 19) === String(customerStart).slice(0, 19);
    if (sameWallClock) {
      answer = 'Zoho IGNORED the timezone field — from_time is read in the ORG zone';
      detail += 'Both times are identical, which means the timezone field did not shift anything. ' +
        'The build must convert the signer\'s chosen instant to ORG-local wall clock before formatting. ' +
        'zohoFromTime() already takes the zone as an argument, so this is a one-line change at the call site — ' +
        'but without it every signer outside the org zone books the wrong hour.';
    } else {
      answer = 'Zoho HONOURED the timezone field — from_time is read in the zone we send';
      detail += 'The two differ, which means Zoho applied the timezone field. Build as specified: send the ' +
        'signer\'s wall clock with the signer\'s IANA zone.';
    }
  }

  return ok(answer, detail, { created: created.json, read: read.json },
    { bookingId, staff: staff.id, sent: { from_time, timezone: probeZone, orgTimezone: CONFIG.orgTimezone() } });
}

// ---------------------------------------------------------------------------
// Q3 — how long is a payment session valid?
// ---------------------------------------------------------------------------
async function checkPaymentSession() {
  const miss = missingEnv(REQUIRED.payments);
  if (miss.length) return ok('Cannot run', `Missing environment variables: ${miss.join(', ')}`, null);

  const res = await paymentsPost('/paymentsessions', {
    amount: '25.00',
    currency: 'USD',
    description: 'STEP0 diagnostic — not a real booking',
  });
  const session = res.json?.payments_session ?? res.json?.data ?? res.json ?? {};
  const sessionId = session.payments_session_id ?? session.payment_session_id ?? session.id ?? null;

  // Surface anything that smells like an expiry rather than guessing a field name.
  const expiryFields = {};
  const scan = (obj, path = '') => {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (/expir|ttl|valid|timeout/i.test(k)) expiryFields[(path ? path + '.' : '') + k] = v;
      if (v && typeof v === 'object') scan(v, (path ? path + '.' : '') + k);
    }
  };
  scan(res.json);

  if (!res.ok || !sessionId) {
    return ok('Cannot run — session creation failed',
      `Create Payment Session returned HTTP ${res.status}. Check the Payments client credentials, the ` +
      'account_id (sandbox has its own), and that the refresh token carries the Payments scope.',
      res.json ?? res.raw, { sessionId: null });
  }

  const found = Object.keys(expiryFields).length;
  return ok(
    found ? 'Session created — expiry reported in the response' : 'Session created — no expiry field returned',
    found
      ? `Zoho returned ${JSON.stringify(expiryFields)}. Set the slot_holds TTL to that value plus two minutes: ` +
        'the hold must outlive the session, or a slow customer pays against a lapsed hold and becomes a refund.'
      : 'The create response carries no expiry field, so the lifetime has to be measured rather than read. ' +
        'Leave this session alone, come back in 15 and then 30 minutes, and use "Re-check this session" below. ' +
        'The moment it stops being payable, that is the lifetime. Until it is known, keep the hold at 10 minutes ' +
        'and accept that the slot-lost refund path covers the gap.',
    res.json, { sessionId, expiryFields });
}

async function recheckSession(sessionId) {
  const miss = missingEnv(REQUIRED.payments);
  if (miss.length) return ok('Cannot run', `Missing environment variables: ${miss.join(', ')}`, null);
  if (!sessionId) return ok('Cannot run', 'No session id supplied. Run the payment session check first.', null);
  const res = await paymentsGet(`/paymentsessions/${encodeURIComponent(sessionId)}`);
  return ok(res.ok ? 'Session still retrievable' : `Session no longer retrievable (HTTP ${res.status})`,
    res.ok
      ? 'Note the time. Keep re-checking until this fails — the elapsed time at first failure is the session lifetime.'
      : 'This is the answer: the session has expired. Elapsed time since creation is the lifetime.',
    res.json ?? res.raw, { sessionId });
}

// ---------------------------------------------------------------------------
// Q4 — can Flow trigger on a status change to noshow?
// ---------------------------------------------------------------------------
async function checkNoshow(bookingId) {
  const miss = missingEnv(REQUIRED.bookings);
  if (miss.length) return ok('Cannot run', `Missing environment variables: ${miss.join(', ')}`, null);
  if (!bookingId) {
    return ok('Cannot run', 'No booking id supplied. Run the Flow check first — it creates the appointment this marks.', null);
  }
  const res = await bookingsPostForm('/updateappointment', { booking_id: bookingId, action: 'noshow' });
  return ok(
    res.ok ? 'Marked noshow — now check whether Flow fired' : `Update failed (HTTP ${res.status})`,
    res.ok
      ? `Appointment ${bookingId} is marked noshow. Open Zoho Flow's execution history and look for a run ` +
        'triggered by this change. A run means no-show refunds can be event-driven, the same shape as ' +
        'cancellations. No run means they need a nightly sweep over appointments whose time has passed — ' +
        'more code, and a delay between the notary marking and the money moving.'
      : 'The update was rejected. Check that the booking id is current and that the OAuth scope allows updates.',
    res.json ?? res.raw, { bookingId });
}

async function cancelBooking(bookingId) {
  const miss = missingEnv(REQUIRED.bookings);
  if (miss.length) return ok('Cannot run', `Missing environment variables: ${miss.join(', ')}`, null);
  if (!bookingId) return ok('Cannot run', 'No booking id supplied.', null);
  const res = await bookingsPostForm('/updateappointment', { booking_id: bookingId, action: 'cancel' });
  return ok(
    res.ok ? `Cancelled ${bookingId}` : `Cancel failed (HTTP ${res.status})`,
    res.ok
      ? 'The test appointment is off the notary\'s calendar. If the BlueNotary Flow fired on creation, it should ' +
        'also have fired on cancellation — worth confirming the session was torn down too.'
      : 'Cancel it by hand in the Zoho Bookings UI before leaving. A stray STEP0 appointment on a real ' +
        'calendar is exactly the mess this page exists to avoid.',
    res.json ?? res.raw, { bookingId });
}

// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  const expected = process.env.STEP0_TOKEN;
  if (!expected) {
    res.statusCode = 503;
    return res.end(JSON.stringify({
      answer: 'Disabled',
      detail: 'STEP0_TOKEN is not set. Set it in the Vercel project to enable this diagnostic, and unset it ' +
              'the moment the answers are recorded. Without it every check refuses to run.',
    }));
  }

  const supplied = req.headers['x-step0-token'] ||
    new URL(req.url, 'http://x').searchParams.get('token') || '';
  if (!tokenMatches(String(supplied), expected)) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ answer: 'Unauthorized', detail: 'Bad or missing step 0 token.' }));
  }

  const url = new URL(req.url, 'http://x');
  const check = url.searchParams.get('check');
  const bookingId = url.searchParams.get('booking_id');
  const sessionId = url.searchParams.get('session_id');

  try {
    let out;
    switch (check) {
      case 'staff':           out = await checkStaff(); break;
      case 'flow':            out = await checkFlow(); break;
      case 'timezone':        out = await checkTimezone(); break;
      case 'payment_session': out = await checkPaymentSession(); break;
      case 'session_recheck': out = await recheckSession(sessionId); break;
      case 'noshow':          out = await checkNoshow(bookingId); break;
      case 'cancel':          out = await cancelBooking(bookingId); break;
      default:
        res.statusCode = 400;
        return res.end(JSON.stringify({ answer: 'Unknown check', detail: `No check named "${check}".` }));
    }
    res.statusCode = 200;
    return res.end(JSON.stringify(out, null, 2));
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({
      answer: 'The check threw',
      detail: String(err && err.message ? err.message : err),
      raw: null,
    }, null, 2));
  }
}
