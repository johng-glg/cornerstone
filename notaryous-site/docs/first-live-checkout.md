# First live checkout — runbook

You are taking a real $25 payment against a real notary's calendar, alone, on code
that has never run against Zoho. Assume something fails. Everything below is written
so that when it does, you know which step broke and what state you are in.

**Before you start, open these in tabs:** the `/book-beta` page, Vercel → Logs (runtime),
Supabase → `glg-ron` → SQL editor, the BlueNotary dashboard, and Zoho Bookings.

**Use your own email and phone.** You are the signer.

---

## 0. Preflight — five env vars to set first

`/api/checkout` will 503 without these. Set them in Vercel first.

| Variable | Where it comes from |
|---|---|
| `SUPABASE_URL` | Supabase → `glg-ron` → Project Settings → API. **This is the one that bit us** — `/api/availability` works without it, `/api/checkout` refuses |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page. Service role, not anon — it must bypass RLS |
| `ZOHO_PAY_API_KEY` | Zoho Payments → Settings → **Developers Space**. This is the widget's client-side key — confirm it is the publishable one, not a secret |
| `ZOHO_PAY_DOMAIN` | Two-letter country code. `US` |
| `BOOKING_IS_TEST` | Set to `true` for this run. It flags the row `is_test` so it can be excluded from reporting later. **Unset it afterwards** |

A 503 from `/api/checkout` now names every missing variable at once, in the response
body **and** in the Vercel log:

```json
{"error":"not_configured","missing":["SUPABASE_URL"],"detail":"Not configured: SUPABASE_URL"}
```

Sanity check before clicking anything — this should return times, not an error:

```
curl -s "https://notaryous.vercel.app/api/availability?from=$(date -u +%Y-%m-%dT%H:%M:%SZ)" | head -c 400
```

| What you see | What it means |
|---|---|
| `{"slots":[...]` | Good. Note `staff_count`, and check `source`: `zoho` means holds are being subtracted; **`zoho-no-holds` means Supabase is not configured** and checkout will 503 |
| `{"error":"no_staff"}` | Staff discovery is failing. Stop — nothing downstream will work |
| `{"error":"unreadable_availability"}` | Zoho's response format is not what the parser expects. Stop, send me `sample` |
| `{"error":"not_configured"}` | `missing` names the variable |

---

## 1. Pick a slot and submit the form

Go to `/book-beta`, choose a time **at least 2 hours out**, fill in the form, click
**Continue to payment**.

**Watch:** the button should go to `Starting…`. In Vercel logs you want a `POST /api/checkout`
returning **200**.

**Immediately check the hold** — this is the first thing that can silently not happen:

```sql
select id, slot_start_utc, staff_id, payment_session_id, expires_at, paid_at, booking_id
from slot_holds order by created_at desc limit 3;
```

| What you see | What it means |
|---|---|
| One row, `payment_session_id` set, `expires_at` ≈ 17 min out | Correct. Continue |
| Row exists, `payment_session_id` **null** | The session was created but not attached. Not fatal — but tell me |
| No row | The claim failed. `/api/checkout` should have returned 409 |
| `expires_at` only ~10 min out | Migration 003 did not apply. **Stop** |

**If you get a 409 "slot_taken":** re-derived availability disagreed with the page.
Reload and pick another time. Not a failure — it is the guard working.

---

## 2. The payment widget — the most likely thing to break

**This code has never executed.** It loads `zpayments.js` from Zoho's CDN and calls a
method whose name is inferred from the payment-*method* widget docs, because the
checkout widget's method is not documented anywhere I could reach.

**Open the browser console before clicking.** Three specific things to look for:

| Console message | Meaning | What to send me |
|---|---|---|
| `no known checkout method on ZPayments instance. Available: …` | The method name guess was wrong | **The full `Available:` list.** This is the answer — one line and I can fix it |
| `[calendar] ZPayments checkout method is "X", not "requestPaymentMethod"` | A fallback worked | The value of `X` |
| `could not load https://static.zohocdn.com/...` | CDN blocked, or the URL moved | Whether the URL loads in a new tab |

If the widget never appears, **nothing has been charged.** The hold expires in 17 minutes
on its own. Nothing to clean up.

**If the widget does appear:** pay with a real card. Watch for the amount reading
**$25.00** and the currency USD.

---

## 3. Confirmation

After payment the button reads `Confirming…` and the page polls `/api/confirm` for up to
90 seconds.

**Watch Vercel logs.** `POST /api/confirm` will be called repeatedly. What you want is a
**200** with `{"status":"booked"}`.

| Response | Meaning | Action |
|---|---|---|
| `402 {"status":"unpaid"}` repeatedly, then a timeout | Zoho has not marked the session paid | Check the Zoho Payments dashboard: did the charge land? If yes, the status string is one we do not recognise — see the log line below |
| Log: `unrecognised payment session status — treated as unpaid` | **This is the important one.** Send me the `status` value verbatim | Fixable in one line |
| `500 {"error":"context_lost"}` | Paid, but `meta_data` did not come back in a shape we could read | **Send me the raw retrieve response.** This is the inferred `{key, value}` element shape being wrong |
| `500 {"error":"booking_failed"}` | Paid, appointment not created. See §5 | Do not retry payment |
| `200 {"status":"booked"}` | Done. Go to §4 |

**Do not pay twice, whatever happens.** If you are unsure whether the money left, check
Zoho Payments before doing anything else.

---

## 4. Verify the whole chain — four checks, in order

### 4a. The hold resolved

```sql
select payment_session_id, paid_at, booking_id, expires_at
from slot_holds order by created_at desc limit 1;
```

Want: `paid_at` set **and** `booking_id` set. `paid_at` set with `booking_id` null is the
paid-but-not-booked state — go to §5.

### 4b. The row landed in ron_sessions

```sql
select booking_id, payment_session_id, payment_id, zoho_staff_id, client_timezone,
       client_phone, is_test, payment_status, session_status, bn_session_id, notary_email
from ron_sessions order by created_at desc limit 1;
```

| Column | Expected | If wrong |
|---|---|---|
| `payment_session_id`, `payment_id` | both set | the calendar's write did not land |
| `zoho_staff_id` | set | availability subtraction will not work for future bookings |
| `client_timezone` | your zone | the confirmation email will render in the wrong zone |
| `is_test` | `true` | you did not set `BOOKING_IS_TEST` |
| `session_status` | `scheduled` within ~30s | **see below — this is the one to watch** |
| `bn_session_id`, `notary_email` | both set | the Flow did not fire |

**If `session_status` is still `awaiting_payment` after a minute**, the Zoho Flow did not
pick the row up. That is the handshake described in the build log — the calendar writes
`awaiting_payment` deliberately so `handleBooking()`'s duplicate branch creates the
BlueNotary session. If it stays stuck, check:

1. Did the Flow fire at all? Zoho Flow → execution history.
2. `select event_type, received_at from ron_session_events order by received_at desc limit 5;`
   — you should see `booking_received` then `bn_session_created`.

### 4c. Zoho Bookings

The appointment exists, at **the time you picked in your own zone**, with the right notary.
A wrong hour here means the timezone handling is wrong — send me what you picked and what
Zoho shows.

### 4d. BlueNotary

A session exists for that appointment, with you as signer and a notary assigned.

---

## 5. If it fails after payment

The two states that involve real money.

### `booking_failed` — paid, no appointment

The Vercel log line has everything: `payment_session_id`, `payment_id`, `slot`, `staff_id`,
`email`. The database also knows:

```sql
select * from slot_holds where paid_at is not null and booking_id is null;
```

That row is deliberately protected — `purge_expired_slot_holds()` will not delete it.

**Two options.** Either create the appointment by hand in Zoho Bookings for that slot and
staff (the Flow will fire and BlueNotary follows), or refund via Zoho Payments using
`payment_id`. If you refund, record it:

```sql
update ron_sessions
   set refund_reason = 'platform_failure', refunded_at = now(), refund_id = '<zoho refund id>'
 where payment_session_id = '<psid>';
```

(That only works if a `ron_sessions` row exists. If the failure was before the row was
written, the `slot_holds` row is the record — leave it for me.)

### `context_lost` — paid, we cannot tell what for

Same money position, less information. The `slot_holds` row still has the slot and staff,
so recovery is the same. **Send me the raw session response** — this failure is the
`meta_data` shape and it will affect every booking until it is fixed.

---

## 6. Afterwards

- [ ] **Unset `BOOKING_IS_TEST`** in Vercel
- [ ] Cancel the test appointment **in Zoho Bookings** — not in BlueNotary. Going through
      Zoho fires the cancel Flow, which expires the BN session and writes `cancelled` to
      `ron_sessions`. Cancelling in BlueNotary leaves the row saying `scheduled` forever.
      (This is exactly what happened with the step 0 probes.)
- [ ] Expect an ops alert saying *"confirm $10 refund issued"* — stale copy, the fee is
      $25. Known issue, item 8 in `glg-ron-orchestration/docs/KNOWN-ISSUES.md`
- [ ] Refund yourself the $25 via Zoho Payments
- [ ] Send me: the widget method name, the payment session `status` string, and the raw
      `meta_data` array as it came back

Those three answers are the entire point of this run. Everything else is confirmation.
