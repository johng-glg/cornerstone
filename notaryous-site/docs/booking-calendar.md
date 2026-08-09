# Bespoke booking calendar — build log

Replacing the Zoho Bookings iframe with a branded calendar: availability from Zoho
Bookings, payment through Zoho Payments, appointment written back to Zoho, existing
Zoho Flow → BlueNotary chain untouched.

**`index.html` is untouched and stays that way until cutover (step 10).** Guard hash:

```
ce039c521e00b4f53df11932df76ecd73818b328b64456b9671f5e73c4564afa  index.html
```

Check it before every commit on this workstream:
`sha256sum index.html`. If it has moved, the change was not authorised by step 10.

---

## Status

| Build step | State |
|---|---|
| 0. The four answers | **complete** — `/step0` deleted |
| 1. Zoho auth + token refresh + `/api/availability` | **DONE — running live** |
| 2. Payments session + server confirm + widget | **DONE — verified end to end live**, booking `#NO-00126` |
| 3. Booking store | **superseded** — no `bookings` table; `ron_sessions` is extended instead, see below |
| 4. Happy path | **DONE — verified against production**, see finding 10 |
| 5. `slot_holds` + concurrency | **done, applied** — spec bug found, see below; TTL 17 min |
| 6. Refund paths | blocked on credentials |
| 6b. Refund tracking columns | **done, applied** |
| 7. Front end calendar | **done on fixtures, verified** |
| 8. Reconciliation + alerting | not started |
| 9–11. Cutover | not started |

Shipped so far: `db/001_ron_sessions_calendar.sql`, `db/002_slot_holds.sql`,
`db/003_calendar_checkout.sql`, `db/004_hold_signer.sql` (**all applied to `glg-ron`**),
`lib/zoho-datetime.mjs` (19 tests), `lib/availability.mjs` (20 tests),
`lib/zoho-bookings.mjs` (17 tests), `lib/payments.mjs` (19 tests),
`api/availability.mjs` (18 tests), `api/checkout.mjs` + `api/confirm.mjs` (27 tests),
`api/_zoho.mjs` (8 tests), `api/_db.mjs`, `book-beta.html` + `lib/calendar.mjs`.

128 tests, all passing, no dependencies:

```
node --test lib/*.test.mjs api/*.test.mjs
```

---

## Blocked, and why

Step 0 is complete and `/step0` is deleted. What remains blocked:

- **Refund execution.** The columns and constraints exist; issuing a refund needs the
  Zoho Payments refund scope string, which is not in the docs — read it off the API
  Console scope picker.

## Findings

### 1. The `slot_holds` unique index in the spec cannot be created

The spec asks for:

```sql
create unique index on slot_holds (slot_start_utc, staff_id)
  where expires_at > now();
```

Postgres rejects it:

```
ERROR: functions in index predicate must be marked IMMUTABLE
```

`now()` is `STABLE`, not `IMMUTABLE`, and index predicates must be `IMMUTABLE` — an
index cannot have a membership rule that changes as the clock moves, because nothing
would re-index rows as they age out. Verified against PostgreSQL 18. Not a version
quirk, and it would have stopped build step 5 dead.

**What is shipped instead** keeps every property the spec asked for, including "let the
database enforce it; do not check-then-insert in application code":

- Unconditional `unique (slot_start_utc, staff_id)`.
- A `claim_slot_hold()` function doing `insert … on conflict … do update … where
  slot_holds.expires_at <= now() returning *` — one atomic statement. It returns a row
  if the caller now holds the slot, and **no rows** if a live hold exists. The API turns
  no-rows into a 409.

Verified against real Postgres:

| Acceptance criterion | Result |
|---|---|
| Two simultaneous checkouts on the same slot | 1 winner, 1 clean 409 |
| Abandoned checkout frees the slot within the TTL | slot re-claimable after expiry, no sweeper |
| No cancelled-hold litter | one row per slot, reused in place |
| Different staff, same time | independent, both hold |

### 2. `pgcrypto` was not needed

`gen_random_uuid()` has been core Postgres since 13. Dropped the extension — one less
thing to be enabled in the Supabase project.

### 3. The date formatter throws on the DST gap rather than shifting an hour

`lib/zoho-datetime.mjs`, 19 tests. The brief calls the `dd-MMM-yyyy HH:mm:ss` format a
trap; it is worse than it looks, and the tests pin each one:

- **Runtime timezone.** Vercel runs UTC, laptops do not. Every function takes the zone
  explicitly; none reads the ambient one. A test asserts identical output with
  `process.env.TZ` set to four different zones.
- **Runtime locale.** `MMM` must be English. Everything pins `en-US`, so a server
  negotiated elsewhere cannot emit `janv.`.
- **`hour12: false` vs `hourCycle: 'h23'`.** `hour12:false` is specified to produce
  h24 in some engines, rendering midnight as `24:00:00` on the *previous* day — a
  booking a day and an hour from what the customer picked. Pinned to `h23` and tested.
- **The spring-forward gap.** 02:30 on a US spring-forward Sunday does not exist. The
  obvious two-pass conversion silently returns an instant that renders as 01:30 — an
  hour earlier than asked. It now verifies its own round-trip and throws. A gap time in
  an availability response means something is wrong upstream, and surfacing it beats
  booking the wrong hour.
- **Fall-back overlap.** 01:30 occurs twice; both render identically. Documented, and
  the reason everything is derived from a UTC instant rather than round-tripped through
  the string.

### 4. `staff_id` is optional everywhere, and holds are per-notary

The spec had `ZOHO_STAFF_ID` as a required environment variable and every call carrying
it. That made one person a hard dependency of the whole service: they leave and booking
stops, and a second notary adds no capacity because nothing would ever ask for their
diary. `ZOHO_STAFF_ID` is now an **override for `/step0` only** — it pins the probes to
one known calendar. It is not in `REQUIRED.bookings`, and production should run without
it so a staffing change needs no deploy.

**How availability works now.** `/api/availability` resolves the service's staff from
Zoho, asks each of them for their diary, and unions the results. Each time is tagged
with who is free at it:

```json
{
  "slots": ["2026-09-01T17:00:00.000Z", "2026-09-01T18:00:00.000Z"],
  "staff": {
    "2026-09-01T17:00:00.000Z": ["ada", "grace"],
    "2026-09-01T18:00:00.000Z": ["grace"]
  },
  "staff_count": 2
}
```

`slots` stays a flat array of ISO strings so an older client keeps working; `staff` is
additive. `staff_id` survives as an optional *filter* for looking at one diary.

**The thing that is easy to get wrong.** A hold is against one staff member, not against
a time. If Ada is held for 11:00 and Grace is free at 11:00, 11:00 is still bookable.
Subtracting holds at the time level — the obvious implementation — silently deletes
capacity: with three notaries it throws away two thirds of the diary the moment anyone
opens a checkout, and it presents as "we're just busy". So holds are subtracted from a
slot's *staff list* and the slot disappears only when that list empties. There is a test
named for it in `lib/availability.test.mjs`, and the same case again at route level in
`api/availability.test.mjs`.

**Choosing the notary is the server's job.** The page never sends a staff id.
`pickStaff()` takes whoever has the fewest live holds, breaking ties on a rotation keyed
by the slot's own timestamp — deterministic, so it is testable, but still spread across
the roster. A client-chosen notary would be a way to book someone another checkout is
already holding.

**Empty is never published as empty.** Three failures used to look identical to a
customer — no staff resolved, every Zoho call erroring, and a response format we can no
longer parse all render as a blank fortnight, which reads as normal business. Each is
now a distinct 502 (`no_staff`, `upstream`, `unreadable_availability`). Only a genuinely
free-of-slots diary returns 200 with `slots: []`. `parseSlotInstants` returns what it
could not understand alongside what it could, so "the format moved" is detectable rather
than indistinguishable from "nobody is free".

**`db/004_staff.sql`** adds `bookings.staff_id`, a check that a `booked` row names a
notary, and a partial unique index on `(slot_start_utc, staff_id) where status in
('paid','booked')`. Verified against PostgreSQL 18: same slot different notary is
allowed, same slot same notary is rejected, and a refund frees it again. Unlike the
`slot_holds` predicate in finding 1 this one is legal — `status` and `staff_id` are
columns, so the predicate is IMMUTABLE.

### 5. There was already a live service, and it changes where everything lives

`glg-ron-orchestration` has been running since 14 July 2026 and is the
BlueNotary integration: two Zoho Flows post to it on booking and cancellation,
and it creates and cancels the RON sessions. It had **no version control** — the
only copy was the Vercel deployment — and is now recovered into
`johng-glg/glg-ron-orchestration`. Its database is the Supabase project
`glg-ron` (ref `xatqfliscgqswiohzkps`), holding `ron_sessions` and an
append-only `ron_session_events` journal.

**Settled: split by trust boundary, share the database.**

| | Where |
|---|---|
| Availability, holds, checkout, payment, payment confirmation | **this project** (public, cacheable, own deploy cadence) |
| BlueNotary session lifecycle, notary assignment, reconciliation | **glg-ron-orchestration** (authenticated webhooks only) |
| The data | **one `glg-ron` project**, `ron_sessions` as the single row per booking |

The handoff is unchanged: the calendar creates the Zoho appointment, Flow fires,
the orchestration service creates the BlueNotary session. Nothing about the live
integration moves.

Why not build the calendar inside the existing service: its `express.json` is
`{ limit: '25mb', type: () => true }` mounted app-wide *before* routing, so any
caller can already make it buffer 25MB before an auth check runs; `vercel.json`
funnels `/(.*)` into a single function with `maxDuration: 300`, so public
calendar traffic would share concurrency and cold starts with BlueNotary
webhooks and a five-minute reconcile job; and it is load-bearing with live
sessions. It also has no Zoho Bookings client at all — the calendar's server
side is new code wherever it lands.

**`bookings` is dropped.** `ron_sessions` already records the same facts, with
`scheduled_at` as a real `timestamptz`, plus the BlueNotary linkage and journal
a separate table would have had to join against. Neither `bookings` nor
`slot_holds` had been created in any project, so this cost nothing to change.
`db/001_bookings.sql`, `003_refund_tracking.sql` and `004_staff.sql` are deleted
and replaced by `db/001_ron_sessions_calendar.sql`, which is purely additive
against the live table.

### 6. The payment gate was unconditionally open downstream — and is now closeable

The Zoho Flow sends a **hardcoded** `payment_id` / `payment_reference_number`.
This was deliberate — payment was enforced by Zoho's hosted booking page, so
downstream evidence was redundant. Verified against the live journal: all 24
`booking_received` payloads carry exactly nine fields, `payment_status`, `cost`
and `cost_paid` are absent from every one, and there is **one distinct payment
id across all 24 bookings**. So `paymentSignal()` falls through to the constant
and returns `'paid'` every time; all 24 rows are `payment_status = 'cleared'`
and none has ever been `pending`.

The consequence for this build: `awaiting_payment`, `/payments/confirmed`, the
two-hour unpaid alert and `createBnSession`'s unpaid throw are all unreachable
in the live configuration. **There is no second gate.** Calling Book Appointment
is the point of no return — Flow fires, and a real BlueNotary session is created
regardless of payment. Both step 0 probe appointments produced real sessions.

So the ordering in this spec is not merely tidy, it is the only control:
hold → payment session → **server-side confirmation** → Book Appointment. And
the reverse failure has no recovery either — payment clears, Book Appointment
throws, and nothing downstream ever learns a customer paid. The calendar must
catch and refund that itself.

**Update, 2026-08-09 (`#NO-00127`).** The code was never the problem — the Flow
was. `paymentSignal()` could always read real evidence and simply never received
any. The booking Flow now sends `cost` and `cost_paid` as unquoted numbers, so
branch 2 fires on real data, and `payment_status` has been **verified to arrive
as `"paid"`** on a calendar-created appointment — not `"pending"` as step 0
suggested. That earlier observation held for probes booked with
`cost_paid: "0.00"`; sending a real amount changes what Zoho reports.

Once the hardcoded `1234` values are replaced with real ones, all three branches
carry genuine evidence and the downstream gate closes. The ordering above stays
correct regardless — it is what makes the evidence true — but it stops being the
*only* control.

### 7. `zoho_staff_id` and `notary_email` are different identifiers

Zoho availability and Book Appointment work in Zoho staff record ids.
`glg-ron-orchestration`'s `assignNotary()` works in email addresses from
`NOTARY_ROSTER`, chosen independently by least open-session load. Nothing maps
one to the other.

This did not matter while Zoho staff assignment came from the hosted booking
page. Once the calendar picks a staff member, the two assignments can disagree:
the appointment sits on notary A's Zoho calendar while notary B is invited to
the BlueNotary session. `db/001_ron_sessions_calendar.sql` records both so the
divergence is visible; resolving it means either mapping roster entries to Zoho
staff ids or passing the calendar's choice through to `assignNotary`, and that
is a change to a live service.

### 8. The checkout order, and why each step is where it is

`/api/checkout` takes money and creates nothing. `/api/confirm` creates the
appointment. They are separate routes because the payment happens in the customer's
browser in between; the confirmation view polls `/api/confirm` until it reports
`booked`.

**Checkout:** re-derive availability from Zoho → claim the hold → create the payment
session → attach the session to the hold.

The hold is claimed *before* the payment session exists because a database transaction
cannot span an HTTP call. Claim first and a failed session call leaves an orphaned hold
that expires by itself in 17 minutes. Create the session first and a customer can pay
for a slot we then discover we cannot hold. A test asserts the ordering rather than
trusting the reading.

**Confirm:** already booked? → Retrieve Payment Session → mark the hold paid → Book
Appointment → record it.

- **The browser is never believed.** It supplies an opaque session id and nothing else.
  Slot, notary, signer and zone are read back out of the session's `meta_data`, which we
  wrote server-side at checkout and Zoho hands back to us. A tampered client can change
  nothing but which of its own sessions it asks about — there is a test that sends a
  different slot and staff id in the body and asserts the appointment ignores both.
- **Default deny on payment status.** An unrecognised status reads as unpaid, never as
  probably fine, and is logged so it can be added to the known set deliberately rather
  than discovered by a customer. There is no second gate downstream: the Zoho Flow sends
  a hardcoded payment reference, so anything reaching `glg-ron-orchestration` is treated
  as paid.
- **Mark the hold paid before booking.** Between the payment clearing and Zoho returning
  a booking id, `ron_sessions` cannot hold a row at all — `booking_id` is `NOT NULL`. The
  hold is the only thing that exists at that moment, so `slot_holds.paid_at` is set
  first. A row with `paid_at` and no `booking_id` is a customer who paid and has no
  appointment; it is indexed, and `purge_expired_slot_holds()` refuses to delete it.
- **Polling is idempotent.** A second confirm returns the existing booking without
  asking Zoho anything.

**The handshake that makes the handoff work.** `record_calendar_booking()` inserts with
`session_status = 'awaiting_payment'`, which looks wrong because we know the payment
cleared. It is load-bearing. `handleBooking()` creates the BlueNotary session for an
existing row **only** in that state:

```js
if (paid && !row.bn_session_id && row.session_status === 'awaiting_payment')
  return { row: await handlePaymentConfirmed(b.booking_id, b), ... };
return { row, deduped: true };            // ← does nothing at all
```

Insert `pending_creation` instead and the Flow falls through to the second line: a paid
booking, an appointment on a notary's calendar, and no BlueNotary session, silently.
Read it as "awaiting session creation". On conflict the function never touches
`payment_status` or `session_status` — if the Flow arrived first, the orchestration
service already owns them. Both orders are tested against real Postgres.

### 9. Zoho Payments caps `meta_data` at five entries

The first live checkout sent nine and was rejected:

```
400 {"code":"error","message":"meta_data varies from the defined limit"}
```

The documented limits are **5 entries, keys ≤20 characters, values ≤500** — and the
docs say plainly that personally identifiable information must not go in `meta_data`
at all. We were sending the signer's first name, last name, email and phone through
it.

**meta_data now carries one entry: `hold_id`.** Everything else about the booking
lives on the `slot_holds` row it points at — `db/004_hold_signer.sql` adds
`client_email`, `client_first_name`, `client_last_name`, `client_phone` and
`client_timezone`, and the signer travels *with* the claim rather than in a follow-up
`UPDATE`, so there is never a moment where a hold exists without the details
`/api/confirm` needs.

This is better than the design it replaced, not merely smaller. The "browser is never
believed" property is unchanged and arguably stronger: the client still supplies
nothing but an opaque session id, and now the round trip through Zoho carries one
opaque uuid instead of a name, an email and a phone number. Every link from that id to
the appointment runs through data only the server has written.

`buildMetaData()` **throws** above the limits rather than truncating. A silently
dropped entry would surface as a `context_lost` after the customer has paid, which is
the worst possible place to find out. A throw fails a test, or at worst fails a
checkout before any money moves. `META_LIMITS` is exported and a test asserts the
outgoing payload is one entry — the payload, not the intention.

Two consequences worth knowing:

- `claim_slot_hold()` had to be **dropped and recreated**, not `create or replace`d.
  A changed argument list creates an overload, and two overloads both callable with
  four arguments make PostgREST fail with "function is not unique".
- A lost claim returns **one all-NULL row**, not zero rows, because the function
  returns a composite type. `claimHold()` checks `row.id` rather than array length;
  this is verified against every shape PostgREST can hand back, because getting it
  wrong would double-book a notary rather than return a 409.

### 10. The first live checkout — booking `#NO-00126`

Verified end to end on 2026-08-09: hold claimed → payment session → card charged →
payment verified server-side → Zoho appointment → Flow → BlueNotary session `D5862`
with the assigned notary, at the correct time in the signer's own zone. Every column
populated as designed, `is_test true`.

The three answers the run existed to produce:

| Question | Answer |
|---|---|
| Checkout widget method | **`requestPaymentMethod`** — correct on the first attempt, no fallback fired |
| Payment session status when paid | recognised by the existing `PAID` set; no `unrecognised payment session status` log |
| `meta_data` element shape | **`{key, value}`** — the inferred shape was right |

The candidate method list stays in `lib/calendar.mjs`. It costs nothing, and if Zoho
renames the method a future failure reports the instance's real method names instead of
throwing something unreadable.

**Zoho Payments runs on Adyen.** The widget's iframe carries its own CSP whitelisting
Adyen hosts (and, oddly, `api.stripe.com`); its source-map warnings in the console are
Adyen's and harmless. **This matters at cutover:** `vercel.json` sets no
`Content-Security-Policy` today, so nothing is blocked — but anyone adding one to
`index.html` must allow `static.zohocdn.com` in `script-src` and Zoho's payment frame in
`frame-src`, or the widget dies silently on the live site. Add the header to a preview
deployment and complete a checkout on it before it reaches production.

### 11. Zoho ids exceed 2^53, and `payment_id` is what refunds key on

From this same booking:

```
payment_id  22684000000151089   →  parsed as a JSON number  →  22684000000151090
```

Off by one, no error. A refund issued against a rounded id refunds nothing, or refunds
the wrong charge. Zoho sent this one as a **string**, so the live value is correct — but
`glg-ron-orchestration`'s `config.js` already carries a note that Zoho sends 19-digit
service ids as JSON *numbers*, so the shape is not something to rely on across endpoints
or versions.

`exactId()` now recovers the digits from the raw response body whenever `JSON.parse`
produced an unsafe integer, and logs loudly if it cannot. `sessionPayment()` and
`sessionId()` both route through it. Tested with the real ids from this booking.

---

## Settled since the first increment

- **Hold ordering** — claim the hold, *then* create the payment session. A database
  transaction cannot span an HTTP call, and claiming first means a failed session call
  leaves only an orphaned hold that expires on its own.
- **Refund policy** — auto-refund on both cancellation and no-show, as an **internal
  operating practice with no customer-facing copy**. Nothing on the site states a refund
  policy, and the fee placard's "If the session can't be completed, you're refunded"
  line is deleted as part of the cutover commit (step 10).
- **The index** — corrected in the spec to the `claim_slot_hold()` approach.

The refund policy has a consequence worth naming: because no page states it, this
repo's `bookings.refund_reason` is the *only* record of why money went back. That is
why `003_refund_tracking.sql` constrains it — a refund with no reason and a reason with
no refund are both rejected, the same way `failure_reason` is tied to `status='failed'`.

Deleting the placard line does not make the fee copy inaccurate — refunds still happen,
they are simply not advertised. It does change what the page promises, so it belongs in
Kimberly's fee-characterisation review rather than being slipped in with a code change.

## The four step 0 answers

Two are answered — not by probe, but by reading `glg-ron-orchestration`'s live event
journal, which has recorded every booking since 14 July. One is still blocking. One
is dropped.

| Question | Status |
|---|---|
| Does Flow fire on API-created appointments? | **Answered: yes.** Both step 0 probe appointments produced real BlueNotary sessions. No payment handler needs to call the Flow webhook |
| What zone does Zoho read `from_time` in? | **Answered: the declared zone.** `11:00` sent as `America/New_York` against a Pacific org returned `iso_start_time` `15:00Z`. Send the signer's wall clock with the signer's IANA zone. `start_time` renders in the viewer's zone — never compare or store it; `iso_start_time` is the only stable field |
| How long is a payment session valid? | **Answered: 900 seconds.** Measured from a real create response — `created_time` 1786227520, `expiry_time` 1786228420. The hold is now 17 minutes: the session lifetime plus two minutes of slack. It must be the longer of the two, or a customer can still pay against a slot already re-sold |
| Can Flow trigger on `noshow`? | **Dropped.** BlueNotary's own session outcome is a better signal than a notary remembering to mark noshow in Zoho. See the caveat below — it is not free |

**The no-show caveat.** Preferring BlueNotary's signal is right on the merits, but
`session_expired` and `session_terminated` **are not delivered as webhooks** — neither
appears anywhere in 597 journalled events. They are only ever reached by the nightly
reconcile, which writes the status silently and raises no alert. Eleven sessions have
ended in a non-completed terminal state and none produced a refund-decision alert.

So dropping the `noshow` probe does not make no-show refunds free — it moves the work
to `glg-ron-orchestration`, which must alert (or act) from the reconcile path when it
moves a row into a terminal non-completed state. That is item 5 in that repo's
`docs/KNOWN-ISSUES.md`. Until it is fixed, the signal exists but nothing listens, and
it arrives up to 24 hours late.

## `/step0` — deleted 2026-08-08

The diagnostic did its job and is gone: `step0.html`, `api/step0.mjs`,
`api/step0-exchange.mjs` and the `/step0` header block in `vercel.json` are all
removed. `api/_zoho.mjs` and `lib/zoho-bookings.mjs` stay — the token cache, staff
discovery and response parsers are production code that step 0 happened to exercise
first.

Deletion checklist, completed:

- [x] All four answers recorded above
- [x] Both probe appointments cancelled. They had produced real BlueNotary sessions
      with real notaries assigned — the BN sessions were killed in the BlueNotary
      dashboard and the Zoho appointments cancelled afterwards, which fired the cancel
      Flow and reconciled the rows
- [x] Route, page and token-exchange endpoint deleted
- [x] `ZOHO_STAFF_ID` left unset, so production discovers staff from the service
- [ ] **Unset `STEP0_TOKEN` in Vercel** — the only remaining item, and the one this
      build cannot do. With the routes gone it grants nothing, but it should not
      outlive them

## Applying the schema

Both files target the **`glg-ron`** project (ref `xatqfliscgqswiohzkps`) — the same
database `glg-ron-orchestration` writes to. Not a calendar-specific project: if
`SUPABASE_URL` points anywhere else, availability subtracts nothing and the two
services disagree about what is booked.

```
supabase db execute -f db/001_ron_sessions_calendar.sql --project-ref xatqfliscgqswiohzkps
supabase db execute -f db/002_slot_holds.sql            --project-ref xatqfliscgqswiohzkps
supabase db execute -f db/003_calendar_checkout.sql     --project-ref xatqfliscgqswiohzkps
supabase db execute -f db/004_hold_signer.sql           --project-ref xatqfliscgqswiohzkps
```

**`001` has not been run. It ALTERs a live table** that a load-bearing service reads
on every webhook, and it is approved in principle pending review of the SQL. Every
statement is additive — new nullable columns, new indexes, and two CHECK constraints
that reference only the new columns, so validation cannot fail on existing rows.
Nothing is altered or dropped. Verified against PostgreSQL 18: applies and re-applies
cleanly, leaves existing rows untouched, and the orchestration service's own
`insertBooking` and `listOpenSessions` statements still work against the result.

After `001` runs, re-dump `glg-ron-orchestration/supabase/schema.sql` so the two repos
do not drift.

Both are idempotent — safe to re-run. Both tables have RLS enabled
with no policies:
anon and authenticated read nothing, the serverless functions use the service role key
which bypasses RLS. `bookings` holds customer names, emails and phone numbers, so a
leaked publishable key must not read it.

## Running the tests

```
node --test lib/*.test.mjs api/*.test.mjs
```

73 tests, no dependencies, no build step. `api/availability.test.mjs` stubs `fetch`, so
it exercises the whole route — staff discovery, per-staff availability, hold subtraction
— without reaching Zoho or Supabase. Run these before any change to `from_time`
handling, to how availability is combined, or to who gets picked for a slot.

Test files are excluded from the deploy in `.vercelignore`: Vercel turns every `.mjs`
under `api/` into a public serverless function, so `api/availability.test.mjs` would
otherwise ship as a route.

---

## `/book-beta` — built and measured

`noindex` via meta **and** an `X-Robots-Tag` header covering `/book-beta` and `/api/*`.
Deliberately not a `robots.txt` disallow: a disallowed URL can still be indexed from an
external link, and blocking the crawl means the crawler never reads the `noindex`.

Until `/api/availability` exists the page runs on deterministic fixtures and says so in
the beta bar. The fallback triggers only on a 404 — a 500 or a malformed body is shown
as an error, because a booking page that quietly invents availability is worse than one
that admits it is broken.

| | mobile | desktop |
|---|---|---|
| Performance | **100** | **100** |
| Accessibility | **100** | **100** |
| Best practices | 96 | 96 |
| SEO | 66 | 66 |

**SEO 66 is correct and cannot be fixed.** The only failing audit is `is-crawlable`,
which fails *because* of the `noindex` the spec requires for this page's entire life.
The ≥95 SEO criterion belongs to `index.html` after cutover, where it already passes.
Best practices 96 is the `/api/availability` 404 in the console; it resolves when the
route ships.

Three things that were genuinely wrong and are now fixed:

- **CLS 0.838 → 0.** The beta banner loaded with a short message and swapped in a
  longer one, going from one line to two at the very top of the page and shoving
  everything below it. It now ships with the longer wording and only ever shortens.
- **TBT 610ms → 0ms.** `Intl.DateTimeFormat` was being constructed per call — roughly
  300 constructions per repaint across 90 chips. Memoised by (zone, shape). Slot and
  day clicks also went from ~104 individual listeners to two delegated ones.
- **Heading order.** Day headings were `h3` under an `h2` that is `display:none` on
  mobile, so the rendered order jumped `h1 → h3`. Day headings are now `h2`.

States verified by intercepting the route: empty (`No times left in the next 14 days`
with the phone number), error with a working retry, malformed-body treated as an error,
and the loading skeleton. Timezone change re-renders and clears the selection — Pacific
10:00 am becomes Eastern 1:00 pm. Validation blocks submit and moves focus to the first
bad field. No tap target under 44px, no horizontal overflow from 320px up.

---

## The step panel — presentation only, 2026-08-09

Nothing about the API contract, the data model or the payment logic changed. `/api/availability`,
`/api/checkout` and `/api/confirm` are byte-identical, and so are the 27 tests over them.

**What was wrong.** The page grew downward. Choose a day, times appeared below; fill in
details, the form appended below that; confirm, and the card landed wherever the page had
grown to with a screen of nothing beneath it. At 390px the page went from 1,100px to over
2,000px between the first click and the confirmation.

**What replaced it.** One panel of fixed height with three steps inside it — Time, Details,
Confirmed. Payment is not a step: Zoho's widget takes the screen over and hands it back, so
the panel stays on Details until `/api/confirm` answers.

### `height`, not `min-height`

The spec asked for `min-height` set to the tallest step measured per breakpoint. This uses
`height` with `overflow-y:auto` on the step instead. Same visual result, different failure
mode: with `min-height`, the acceptance criterion holds only while the measurement stays
accurate, and a validation error under three fields, a wrapped 503 notice or a longer
booking reference each quietly break it. With a fixed height the criterion is structural —
content that does not fit scrolls inside the panel and the page cannot move.

Steps are top-aligned with space below rather than centred, as specified.

### Measured

`scratchpad/panelcheck.mjs` drives the real code path — availability, hold, checkout,
payment widget and confirm are stubbed in the page, so `renderBooked` runs for real — and
asserts `document.documentElement.scrollHeight` across steps 1 → 2 → back → 2 → 3.

| width | page height, all steps |
|---|---|
| 1440 / 1280 / 1100 / 960 / 900 | 1096 |
| 901 | 1092 |
| 820 | 1090 |
| 768 | 1086 |
| 430 / 390 | 1172 |
| 360 / 320 | 1192 |

Identical at every width, including the two failure views and the 409 path. No horizontal
overflow, no tap target under 48px inside the panel, and the cross-fade measures 0.15s
normally and 0s under `prefers-reduced-motion`.

Lighthouse, `/book-beta`: **accessibility 100** mobile and desktop, performance 100 both,
best practices 96, SEO 66 — the last two unchanged and explained above. Mobile CLS is
**0.051**, up from 0. It is the webfont swap reflowing the two-line lede *above* the panel
under Lighthouse's throttling — desktop, where that lede is one line, stays at 0, and the
panel itself contributes nothing because its height is fixed. Under the 0.1 "good"
threshold and performance still scores 100.

### One screen per step

| viewport | panel | |
|---|---|---|
| 1440×900, 901×900, 900×900 | 345–815 | fits |
| 390×844 | 321–791 | fits |
| 375×667 | 321–791 | bottom 124px below the fold |
| 320×690 | 321–791 | bottom 101px below the fold |

The spec asks for one step per viewport on mobile. That holds from 390×844 up. On a
375×667 iPhone SE the masthead, beta bar, headline and lede push the last quarter of the
panel below the fold; the beta bar is ~57px of that and disappears at cutover, and the rest
would need the panel down to ~340px, which would cost step 1 most of its chips. Left as is,
recorded rather than hidden.

### One behaviour change, and it is a fix

The 409 path does the same three things it always did — say the slot went, drop the
selection, reload availability — but the message now travels back to step 1 with the user.
Previously `setPanelNotice()` wrote it onto the form and the `load()` on the next line
destroyed the form, so **nobody ever read the 409 message**. It now renders above the times,
which is where the user has to act on it. The 503 path, the confirmation copy, the reference
number and both failure views including "do not pay again" are unchanged.

---

## Cutover — the panel is live on `/` and `/book`, 2026-08-09

The Zoho `portal-embed` iframe in `#book` is gone. Three pages now run the panel:
`/`, `/book` and `/book-beta`.

### One stylesheet, one module, three pages

The panel's CSS was inline in `book-beta.html` while it was a staging page. Three
inline copies is a synchronisation problem nobody wins, so it moved to
`lib/calendar.css` — the only stylesheet on this site that is not inline.

Two rules it follows:

- **Every selector is scoped to `#bookpanel`.** `index.html` already uses `.step`,
  `.steps`, `.notice`, `.btn` and `.lede` for entirely different things — a
  three-column "how it works" grid, the Bordeaux compliance block, the gold hero
  button. Those five are renamed with a `bk` prefix rather than left to be settled
  by specificity, which works right up until someone edits the other file.
- **It defines no colours.** The brand tokens come from the host page's `:root`,
  so the panel cannot drift from the site around it. `--panel-h` is set on
  `#bookpanel`, not `:root`, so it does not leak either.

`renderCalendar()` now takes `{ rootEl, betaEl?, days?, onEvent? }` and finds
everything else inside `rootEl`. A page supplies the `#bookpanel` skeleton and
calls it; nothing else about the page is the calendar's business.

### Render-blocking on two pages, not on three

`lib/calendar.css` is 13KB. Loading it normally on `/` pushed mobile LCP from
0.9s to 2.0s and cost the 100 that page has held since launch — measured, by
removing the link and re-running.

So `/` loads it non-blocking (`media="print"` + `onload`). The panel is three
screens below the fold there, so nothing it styles is painted before it arrives.
`/book` and `/book-beta` load it normally and score 98: on those pages the panel
*is* the fold, and a flash of unstyled calendar is worse than a slower LCP on a
1.6 Mbps emulated link. That is a deliberate two-point trade, not an oversight.

| | Perf | A11y | SEO | LCP | CLS |
|---|---|---|---|---|---|
| `/` mobile | **100** | **100** | **100** | 0.9 s | 0 |
| `/book` mobile | 98 | **100** | **100** | 2.0 s | 0 |
| `/book-beta` mobile | 98 | **100** | 66 | 1.8 s | 0 |

Mobile CLS is **0** on all three, down from the 0.051 measured on the previous
`/book-beta`. That shift was the webfont swap reflowing a two-line lede above the
panel; the tightened mobile chrome removed it.

The fixed-height acceptance run was re-run against all three pages, not just the
staging one — a divergence there would mean a host page's CSS had reached inside
`#bookpanel`. Page height is identical across steps at all twelve widths on all
three, including both failure views and the 409 path.

### `/book`

Masthead, one heading, the panel, the same "Read this before you book"
compliance block, footer. No hero, no fee schedule, no sticky bar. It exists so a
link in an email lands on the calendar rather than three screens above it.

Indexed, with its own canonical and a sitemap entry at priority 0.8. It is a
subset of `/`, so there is some duplicate-content overlap; the titles and
descriptions differ and the homepage keeps priority 1.0. One line in
`book.html` flips it to `noindex` if that turns out to be the wrong call.

### Two things that were missing and are now handled

- **No JavaScript.** The panel would have sat as a loading skeleton forever. All
  three pages now hide `#bookpanel` inside `<noscript>` and show the phone number
  — plus, on `/` and `/book`, a link to Zoho's own scheduler.
- **Analytics.** `booking_iframe_load` had no iframe left to fire on.
  `renderCalendar` gained an `onEvent` hook reporting `ready`, `slot_selected`,
  `checkout_started`, `booked` and `needs_help`. It never carries a name, an
  email, a phone number or a slot time — only what a funnel needs — and it is
  wrapped so an analytics error can never reach the calendar. `/book` tags its
  events with `page: 'book'` so email traffic is separable.

### The Zoho fallback link stays

The `.fallback` line under the panel on `/` still opens Zoho's scheduling page in
a new tab. When `/api/availability` is down the panel says so and gives the phone
number, but this is a booking route that does not depend on our API at all, and
it costs one line. It is the reason the Zoho theming items in the site README are
downgraded rather than deleted.

## Next increment

1. **`/api/checkout`** — claim the hold, then create the payment session, in that order.
   Staff selection is the part that is ready: it re-reads live holds, calls
   `pickStaff()` on the chosen slot, and claims against that specific notary, so two
   people checking out for 11:00 get different notaries rather than a 409. It only
   returns 409 when every notary on the slot is taken. The rest of the route is held
   back on step 0's answer about payment session lifetime — that sets the hold TTL, and
   guessing it is what turns a slow customer into a refund.
2. The payment confirmation handler and the refund paths, all of which need step 0's
   answers before they can be finished.
3. Reconciliation: "paid for >15 minutes with no `zoho_booking_id`" is already indexed
   for in `001`.

**Not verified against Zoho, and cannot be from here.** Everything in
`lib/zoho-bookings.mjs` is written against the documented response shapes, which vary
between Zoho's own API versions. The parsers accept every shape they are documented to
return rather than betting on one, and they report what they could not read instead of
returning an empty list — but the first real call is still the first real test.
`ZOHO_STAFF_PATH` and `ZOHO_AVAILABILITY_PATH` exist so a wrong path is an environment
variable away from fixed rather than a deploy.
