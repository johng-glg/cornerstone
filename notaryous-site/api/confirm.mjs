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
 * believed: it supplies an opaque session id and nothing else. Everything about
 * the booking — slot, notary, signer — is read back out of the session's
 * `meta_data`, which we wrote server-side at checkout and Zoho returns to us.
 * A tampered client can therefore change nothing except which of its own
 * sessions it asks about.
 *
 * Step 4 is irreversible. Once the appointment exists, Zoho Flow fires and
 * glg-ron-orchestration creates a real BlueNotary session — and it cannot tell
 * paid from unpaid, because the Flow sends a hardcoded payment reference. This
 * route is the only thing standing between an unpaid request and a real RON
 * session.
 */

import { CONFIG, REQUIRED, missingEnv, bookingsPostForm, paymentsGet } from './_zoho.mjs';
import { missingDbEnv, markHoldPaid, resolveHold, recordBooking, bookingForSession } from './_db.mjs';
import { sessionPayment, parseMetaData } from '../lib/payments.mjs';
import { parseBookingId } from '../lib/zoho-bookings.mjs';
import { zohoFromTime } from '../lib/zoho-datetime.mjs';

const FEE = process.env.BOOKING_FEE_USD ?? '25.00';
const send = (res, status, body) => { res.statusCode = status; return res.end(JSON.stringify(body)); };

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

  try {
    // --- 1. idempotency ----------------------------------------------------
    const existing = await bookingForSession(psid);
    if (existing?.booking_id) {
      return send(res, 200, { status: 'booked', booking_id: existing.booking_id, slot: existing.scheduled_at });
    }

    // --- 2. verify the money, server-side ----------------------------------
    const retrieved = await paymentsGet(`/paymentsessions/${encodeURIComponent(psid)}`);
    if (!retrieved.ok) {
      return send(res, 502, { error: 'payment_lookup_failed', detail: 'We could not check the payment. Nothing has changed.' });
    }

    const pay = sessionPayment(retrieved.json);
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

    const meta = parseMetaData(retrieved.json);
    const required = ['slot', 'staff_id', 'email', 'timezone'];
    const missingMeta = required.filter((k) => !meta[k]);
    if (missingMeta.length) {
      // Paid, but we cannot tell what for. Never guess a slot — an appointment
      // at the wrong time is worse than one that needs a human.
      console.error(JSON.stringify({
        severity: 'ERROR', msg: 'PAID but meta_data incomplete — manual booking required',
        payment_session_id: psid, payment_id: pay.paymentId, missing: missingMeta,
      }));
      return send(res, 500, {
        error: 'context_lost',
        detail: 'Your payment went through, but we could not complete the booking automatically. We will call you.',
      });
    }

    // --- 3. durable "paid, not yet booked" ---------------------------------
    await markHoldPaid(psid, pay.paymentId).catch((err) => {
      // Not fatal — but it is the record ops would reconcile against, so a
      // failure here must be visible before we cross the point of no return.
      console.error(JSON.stringify({ severity: 'ERROR', msg: 'could not mark hold paid', payment_session_id: psid, error: String(err?.message || err) }));
    });

    // --- 4. THE POINT OF NO RETURN -----------------------------------------
    const slotIso = meta.slot;
    const signerZone = meta.timezone;
    // Zoho honours the declared timezone field (step 0, verified): send the
    // signer's own wall clock with the signer's own zone.
    const fromTime = zohoFromTime(new Date(slotIso), signerZone);

    const booked = await bookingsPostForm('/appointment', {
      service_id: CONFIG.serviceId(),
      staff_id: meta.staff_id,
      from_time: fromTime,
      timezone: signerZone,
      customer_details: {
        name: [meta.first_name, meta.last_name].filter(Boolean).join(' ') || 'Client',
        email: meta.email,
        phone_number: meta.phone || '',
      },
      payment_info: { cost_paid: FEE },
    });

    const bookingId = parseBookingId(booked.json);
    if (!booked.ok || !bookingId) {
      // Paid, and no appointment. The hold carries paid_at with no booking_id,
      // which is the query ops runs. This is the case the refund policy exists
      // for and it must be loud.
      console.error(JSON.stringify({
        severity: 'ERROR', msg: 'PAID BUT NOT BOOKED — refund or manual booking required',
        payment_session_id: psid, payment_id: pay.paymentId,
        slot: slotIso, staff_id: meta.staff_id, email: meta.email,
        zoho_status: booked.status,
      }));
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
      p_zoho_staff_id: meta.staff_id,
      p_scheduled_at: slotIso,
      p_client_email: meta.email,
      p_client_first_name: meta.first_name ?? '',
      p_client_last_name: meta.last_name ?? '',
      p_client_phone: meta.phone ?? null,
      p_client_timezone: signerZone,
      p_is_test: meta.is_test === 'true',
    });
    await resolveHold(psid, bookingId).catch(() => {});

    return send(res, 200, { status: 'booked', booking_id: bookingId, slot: slotIso });
  } catch (err) {
    console.error(JSON.stringify({ severity: 'ERROR', msg: 'confirm failed', payment_session_id: psid, error: String(err?.message || err) }));
    return send(res, 502, { error: 'confirm_failed', detail: 'We could not confirm the booking just now. Please try again.' });
  }
}
