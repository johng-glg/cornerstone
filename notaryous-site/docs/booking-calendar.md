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
| 0. The four answers | **runnable by you** — `/step0` is built, see below |
| 1. Zoho auth + token refresh + `/api/availability` | blocked on credentials |
| 2. Payments session + widget + server confirm + webhook | blocked on credentials |
| 3. `bookings` table | **done, verified** |
| 4. Happy path in sandbox | blocked |
| 5. `slot_holds` + concurrency | **done, verified** — spec bug found, see below |
| 6. Refund paths | blocked on credentials |
| 6b. Refund tracking columns | **done, verified** |
| 7. Front end calendar | **done on fixtures, verified** |
| 8. Reconciliation + alerting | not started |
| 9–11. Cutover | not started |

Shipped so far: `db/001_bookings.sql`, `db/002_slot_holds.sql`,
`db/003_refund_tracking.sql`, `lib/zoho-datetime.mjs` + 19 passing tests,
`book-beta.html` + `lib/calendar.mjs`.

---

## Blocked, and why

**Step 0 cannot be run from this environment, so it is now a page you can run.**
See "`/step0` — the temporary diagnostic" below. It needs a live call to Zoho's Book
Appointment API with real credentials, and neither is available here:

- No credentials. Zoho client id/secret/refresh token do not exist yet.
- Every Zoho host is blocked by the network egress policy. Verified:

  | Host | Result |
  |---|---|
  | `www.zohoapis.com` | blocked |
  | `payments.zoho.com` | blocked |
  | `accounts.zoho.com` | blocked |
  | `static.zohocdn.com` | blocked |

  Same policy that blocks `zohobookings.com` and `notaryous.vercel.app`.

This is the one the brief says not to skip, and it is right: if Flow does not fire on
API-created appointments and nobody checks, a paid client gets an appointment with no
notarization session behind it. **Somebody with Zoho access has to run it** — that is
what `/step0` is for.

Everything from step 1 on also needs secrets that must never reach this repo. The work
that does not need them — schema, the date formatter, the front end — is what is being
built first.

---

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

## The four step 0 answers, and what each one changes

None of these can be answered from this environment — all four need Zoho credentials
and egress, which means someone with a Zoho login, not the build.

| Question | What it changes if the answer is unexpected |
|---|---|
| Does Flow fire on API-created appointments? | If not, the payment confirmation handler must call the Flow webhook itself, or a paid client gets no BlueNotary session |
| What zone does Zoho read `from_time` in? | If it is the org zone rather than the `timezone` field, every out-of-Pacific signer books the wrong hour. `zohoFromTime()` already takes the zone as an argument, so the fix is one call site — but only if we know |
| How long is a payment session valid? | Sets the hold TTL. A session outliving the hold turns a slow customer into a refund and an ops alert |
| Can Flow trigger on `noshow`? | Event-driven no-show refunds, or a nightly sweep. The sweep is more code and a delay between the notary marking and the money moving |

## `/step0` — the temporary diagnostic

**This route is temporary. Delete it once the four answers are recorded below.**
There is a checklist at the end of this section; the last item is a commit that
removes the code.

`step0.html` + `api/step0.mjs` run each of the four checks server-side and render the
answer in plain English with the raw response collapsed underneath. Nothing but the
result reaches the browser.

### Before it will run

Set these in the Vercel project. Every check refuses to run without them, and says
which ones are missing rather than returning a 500.

| Variable | For | Notes |
|---|---|---|
| `STEP0_TOKEN` | the gate | Any long random string. **Unset it to disable the whole route.** |
| `ZOHO_CLIENT_ID` / `_SECRET` / `_REFRESH_TOKEN` | Bookings | Dedicated service user, not John's admin account |
| `ZOHO_SERVICE_ID`, `ZOHO_STAFF_ID` | Bookings | The RON service and the beta staff record |
| `ZOHO_ORG_TIMEZONE` | check 2 | Defaults to `America/Los_Angeles`. Must be the org's real zone or the probe is meaningless |
| `ZOHO_PAYMENTS_CLIENT_ID` / `_SECRET` / `_REFRESH_TOKEN` / `_ACCOUNT_ID` | check 3 | Sandbox has its own account id |
| `ZOHO_ACCOUNTS_HOST`, `ZOHO_API_HOST`, `ZOHO_BOOKINGS_BASE`, `ZOHO_PAYMENTS_HOST` | overrides | Defaults are the documented ones. The point of step 0 is that we do not yet know they are right — a wrong guess should be one env var away from fixed |
| `STEP0_TEST_EMAIL` | optional | Where test confirmations land. Defaults to `step0-test@guardianlit.com` |

### Access control

`noindex` is not access control, and **two of these buttons create real appointments on
the notary's calendar**. The route is gated on `STEP0_TOKEN`, compared without
short-circuiting on the first differing byte. Unset the variable and every check returns
503 — that is the kill switch, and it works without a deploy.

The token is typed into a password field, held in memory, and sent as a header. It never
goes in the URL, so it cannot end up in browser history, a screenshot of the address bar,
or a Vercel access log.

Responses are walked before rendering and anything matching
`access_token|refresh_token|client_secret|api_key|signing_key|authorization` is replaced
with `«redacted»`. Tested.

### What each check can and cannot tell you

Two of the four are fully machine-answerable. Two need a human to look at another system
afterwards, and the page says so rather than implying an answer it does not have.

| Check | Machine-answerable? |
|---|---|
| 1. Flow fires on API-created appointments | **No.** It creates the appointment and reports the booking id. This service has no BlueNotary access, so you check BlueNotary |
| 2. `from_time` zone semantics | **Yes.** Books at 11:00 declaring a non-org zone, reads it back, and compares `start_time` against `customer_booking_start_time` |
| 3. Payment session lifetime | **Partly.** Creates a session and surfaces any field matching `expir\|ttl\|valid\|timeout`. If Zoho returns none, the lifetime has to be measured — "Re-check this session" is there for that |
| 4. Flow triggers on `noshow` | **No.** It marks the appointment; you check Flow's execution history |

Check 1 and check 2 each create an appointment. Check 4 marks check 1's appointment.
Cancel with the button at the bottom before leaving — the page tracks the booking id so
the cancel goes to the right one.

### Deletion checklist

- [ ] Record all four answers in "The four step 0 answers" above, with dates
- [ ] Cancel every STEP0 appointment, and confirm none is left in the Zoho UI
- [ ] Unset `STEP0_TOKEN` in Vercel — immediate kill, no deploy needed
- [ ] Delete `step0.html`, `api/step0.mjs`, the `/step0` block in `vercel.json`,
      and this section
- [ ] Keep `api/_zoho.mjs` — the token cache and request helpers are what
      `/api/availability` and `/api/checkout` are built on

## Applying the schema

```
supabase db execute -f db/001_bookings.sql
supabase db execute -f db/002_slot_holds.sql
```

Both are idempotent — safe to re-run. Both tables have RLS enabled with no policies:
anon and authenticated read nothing, the serverless functions use the service role key
which bypasses RLS. `bookings` holds customer names, emails and phone numbers, so a
leaked publishable key must not read it.

## Running the formatter tests

```
node --test lib/zoho-datetime.test.mjs
```

No dependencies, no build step. Run these before any change to `from_time` handling.

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

## Next increment

1. `/api/availability` with the Zoho token cache, written against the documented shapes
   and unit-tested with recorded fixtures, so it is ready the moment credentials exist.
2. `/api/checkout` — claim the hold, then create the payment session, in that order.
3. The payment confirmation handler and the refund paths, all of which need step 0's
   answers before they can be finished.
