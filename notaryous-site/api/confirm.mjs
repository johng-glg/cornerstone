/**
 * POST /api/confirm  { payment_session_id }
 *
 * The gate. Verifies payment server-side, then creates the Zoho appointment.
 *
 * This is a separate route from /api/checkout because the payment happens in
 * the customer's browser in between; it is polled by the confirmation view
 * until it reports `booked`.
 *
 * ORDER, and why each step is where it is:
 *
 *   1. already booked for this session?  → return it. Polling must not book twice.
 *   2. Retrieve Payment Session from Zoho → the ONLY evidence that counts
 *   3. mark the hold paid                 → the only durable record of
 *                                           "paid, no appointment yet"
 *   4. Book Appointment                   → THE POINT OF NO RETURN
 *   5. record it in ron_sessions, resolve the hold
 *
 * Step 2 is load-bearing in a way that is easy to miss. The browser is never
 * believed: it supplies an opaque session id and nothing else. That id resolves
 * to a Zoho session whose `meta_data` carries one entry — the id of a
 * slot_holds row — and slot, notary and signer are read from that row. Every
 * link in that chain was written by the server. A tampered client can change
 * nothing except which of its own sessions it asks about.
 *
 * meta_data carries one entry rather than nine because Zoho caps it at five and
 * documents that PII must not go in it. The first live checkout learned this at
 * a cost of one 400: `meta_data varies from the defined limit`.
 *
 * Step 4 is irreversible. Once the appointment exists, Zoho Flow fires and
 * glg-ron-orchestration creates a real BlueNotary session — and it cannot tell
 * paid from unpaid, because the Flow sends a hardcoded payment reference. This
 * route is the only thing standing between an unpaid request and a real RON
 * session.
 */

import { CONFIG, REQUIRED, missingEnv, bookingsPostForm, paymentsGet, redact } from './_zoho.mjs';
import { missingDbEnv, getHold, markHoldPaid, resolveHold, recordBooking, bookingForSession } from './_db.mjs';
import { alertOps } from './_alert.mjs';
import { sessionPayment, parseMetaData } from '../lib/payments.mjs';
import { parseBookingId } from '../lib/zoho-bookings.mjs';
import { zohoFromTime } from '../lib/zoho-datetime.mjs';

const FEE = process.env.BOOKING_FEE_USD ?? '25.00';
const send = (res, status, body) => { res.statusCode = status; return res.end(JSON.stringify(body)); };

/** 'Mon, Aug 24 at 1:15 PM PDT' — for alerts a person reads while dialling. */
const humanTime = (iso, tz) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz, weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(new Date(iso));
  } catch { return `${iso} (${tz})`; }   // an alert must never throw on a bad zone
};

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return null; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return null;
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });

  const missing = [
    ...missingEnv(REQUIRED.bookings),
    ...missingEnv(REQUIRED.payments),
    ...missingDbEnv(),
  ];
  if (missing.length) {
    console.error(JSON.stringify({
      severity: 'ERROR', msg: 'not_configured', route: '/api/confirm', missing,
    }));
    return send(res, 503, {
      error: 'not_configured',
      missing,
      detail: `Not configured: ${missing.join(', ')}`,
    });
  }

  const body = await readBody(req);
  const psid = String(body?.payment_session_id ?? '').trim();
  if (!psid) return send(res, 400, { error: 'invalid', detail: 'payment_session_id is required.' });

  // Scoped outside the try so the catch can tell an ordinary failure from one
  // that leaves a charged customer with no appointment. Set once, after Zoho
  // has confirmed the money, and never unset.
  let verifiedPaid = false;

  try {
    // --- 1. idempotency ----------------------------------------------------
    const existing = await bookingForSession(psid);
    if (existing?.booking_id) {
      return send(res, 200, { status: 'booked', booking_id: existing.booking_id, slot: existing.scheduled_at });
    }

    // --- 2. verify the money, server-side ----------------------------------
    const retrieved = await paymentsGet(`/paymentsessions/${encodeURIComponent(psid)}`);
    if (!retrieved.ok) {
      console.error(JSON.stringify({
        severity: 'ERROR', msg: 'payment session lookup REJECTED by Zoho',
        route: '/api/confirm', payment_session_id: psid,
        zoho_status: retrieved.status,
        zoho_body: redact(retrieved.json ?? retrieved.raw ?? null),
      }));
      return send(res, 502, { error: 'payment_lookup_failed', detail: 'We could not check the payment. Nothing has changed.' });
    }

    const pay = sessionPayment(retrieved.json, retrieved.raw);
    if (!pay.paid) {
      // Default deny. An unrecognised status is reported so it can be added to
      // the known set deliberately, rather than discovered by a customer.
      if (!pay.known) {
        console.error(JSON.stringify({
          severity: 'ERROR', msg: 'unrecognised payment session status — treated as unpaid',
          status: pay.status, payment_session_id: psid,
        }));
      }
      return send(res, 402, { status: 'unpaid', payment_status: pay.status ?? 'unknown' });
    }
    verifiedPaid = true;

    // meta_data carries ONE entry — the hold id. Zoho caps it at five and
    // documents that PII must not go in it, so the booking context lives on the
    // slot_holds row instead and is read back from there. The client still
    // supplies nothing but an opaque session id; the chain from that id to this
    // row runs entirely through data the server wrote.
    const meta = parseMetaData(retrieved.json);
    const hold = meta.hold_id ? await getHold(meta.hold_id) : null;

    const missingContext = !meta.hold_id ? ['meta_data.hold_id']
      : !hold ? [`slot_holds row ${meta.hold_id}`]
      : ['slot_start_utc', 'staff_id', 'client_email', 'client_timezone'].filter((k) => !hold[k]);

    if (missingContext.length) {
      // Paid, but we cannot tell what for. Never guess a slot — an appointment
      // at the wrong time is worse than one that needs a human.
      await alertOps('PAID but we cannot tell what for — manual booking required', {
        payment_session_id: psid, payment_id: pay.paymentId,
        hold_id: meta.hold_id ?? null, missing: missingContext,
        action: 'Find the payment in Zoho Payments, call the customer, book by hand or refund.',
      });
      return send(res, 500, {
        error: 'context_lost',
        detail: 'Your payment went through, but we could not complete the booking automatically. We will call you.',
      });
    }

    // --- 3. durable "paid, not yet booked" ---------------------------------
    let paidRecorded = true;
    await markHoldPaid(hold.id, pay.paymentId).catch(async (err) => {
      // Not fatal to the booking, but this row IS the reconciliation query. If
      // it did not write and the booking below also fails, the customer is
      // charged and invisible — the one state no sweep would ever surface.
      paidRecorded = false;
      await alertOps('Payment taken but the hold could not be marked paid — this customer is INVISIBLE to reconciliation', {
        hold_id: hold.id, payment_session_id: psid, payment_id: pay.paymentId,
        email: hold.client_email, slot_utc: new Date(hold.slot_start_utc).toISOString(),
        error: String(err?.message || err),
        action: 'Record this by hand. If the booking below also failed, the customer has paid and has nothing.',
      });
    });

    // --- 4. THE POINT OF NO RETURN -----------------------------------------
    const slotIso = new Date(hold.slot_start_utc).toISOString();
    const signerZone = hold.client_timezone;
    // Zoho honours the declared timezone field (step 0, verified): send the
    // signer's own wall clock with the signer's own zone.
    const fromTime = zohoFromTime(new Date(slotIso), signerZone);

    const booked = await bookingsPostForm('/appointment', {
      service_id: CONFIG.serviceId(),
      staff_id: hold.staff_id,
      from_time: fromTime,
      timezone: signerZone,
      customer_details: {
        name: [hold.client_first_name, hold.client_last_name].filter(Boolean).join(' ') || 'Client',
        email: hold.client_email,
        phone_number: hold.client_phone || '',
      },
      payment_info: { cost_paid: FEE },
    });

    const bookingId = parseBookingId(booked.json);
    if (!booked.ok || !bookingId) {
      // Paid, and no appointment. The hold carries paid_at with no booking_id,
      // which is the query ops runs. This is the case the refund policy exists
      // for and it must be loud.
      // Zoho's own rejection body is the thing that tells you WHY, and it was
      // previously only in the log. It goes in the alert so whoever picks this
      // up can act without a Vercel login.
      await alertOps('PAID BUT NOT BOOKED', {
        customer: [hold.client_first_name, hold.client_last_name].filter(Boolean).join(' ') || null,
        email: hold.client_email, phone: hold.client_phone || null,
        // Both clocks: the one the business books in, and the one the customer
        // will say on the phone. A bare UTC instant is unusable to whoever
        // picks this up.
        session_pacific: humanTime(slotIso, 'America/Los_Angeles'),
        session_for_customer: humanTime(slotIso, signerZone),
        slot_utc: slotIso,
        payment_session_id: psid, payment_id: pay.paymentId,
        staff_id: hold.staff_id, hold_id: hold.id,
        zoho_status: booked.status, zoho_response: redact(booked.json ?? booked.raw ?? null),
        paid_recorded: paidRecorded,
        action: 'Book by hand in Zoho for the slot above, or refund. The card HAS been charged.',
      });
      return send(res, 500, {
        error: 'booking_failed',
        detail: 'Your payment went through, but we could not confirm the appointment. We will call you to sort it out.',
      });
    }

    // --- 5. record --------------------------------------------------------
    // Zoho Flow is already firing. record_calendar_booking is idempotent and
    // does not care whether it or the orchestration service gets here first.
    await recordBooking({
      p_booking_id: bookingId,
      p_payment_session_id: psid,
      p_payment_id: pay.paymentId,
      p_zoho_staff_id: hold.staff_id,
      p_scheduled_at: slotIso,
      p_client_email: hold.client_email,
      p_client_first_name: hold.client_first_name ?? '',
      p_client_last_name: hold.client_last_name ?? '',
      p_client_phone: hold.client_phone ?? null,
      p_client_timezone: signerZone,
      p_is_test: process.env.BOOKING_IS_TEST === 'true',
    });
    await resolveHold(hold.id, bookingId).catch(() => {});

    return send(res, 200, { status: 'booked', booking_id: bookingId, slot: slotIso });
  } catch (err) {
    // A throw AFTER payment was verified is the same customer-facing outcome as
    // the branch above — charged, no appointment — and it used to be a plain
    // log. Alert on it only once the money is known to be ours; before that
    // this is an ordinary failure with nothing at stake.
    if (verifiedPaid) {
      await alertOps('Confirm threw after payment was verified — customer may be charged with no appointment', {
        payment_session_id: psid, error: String(err?.message || err),
        action: 'Check slot_holds for paid_at with no booking_id, then call the customer.',
      });
    } else {
      console.error(JSON.stringify({ severity: 'ERROR', msg: 'confirm failed', payment_session_id: psid, error: String(err?.message || err) }));
    }
    return send(res, 502, { error: 'confirm_failed', detail: 'We could not confirm the booking just now. Please try again.' });
  }
}
