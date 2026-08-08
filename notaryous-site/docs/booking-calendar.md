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
| 0. Flow fires on API-created appointments | **BLOCKED** — see below |
| 1. Zoho auth + token refresh + `/api/availability` | blocked on credentials |
| 2. Payments session + widget + server confirm + webhook | blocked on credentials |
| 3. `bookings` table | **done, verified** |
| 4. Happy path in sandbox | blocked |
| 5. `slot_holds` + concurrency | **done, verified** — spec bug found, see below |
| 6. Refund paths | blocked on credentials |
| 7. Front end calendar | not started |
| 8. Reconciliation + alerting | not started |
| 9–11. Cutover | not started |

Shipped this increment: `db/001_bookings.sql`, `db/002_slot_holds.sql`,
`lib/zoho-datetime.mjs` + 19 passing tests.

---

## Blocked, and why

**Step 0 cannot be done from here, and it gates everything.** It needs a live call to
Zoho's Book Appointment API with real credentials. Two independent reasons it is not
possible in this environment:

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
notarization session behind it. **Somebody with Zoho access has to run it**, and the
answer decides whether the confirmation handler needs an extra call to the Flow webhook.

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

## Spec questions to settle before the next increment

**1. What zone is `from_time` interpreted in?** The spec sends `from_time` as a wall
clock and `timezone` as the signer's IANA zone. If Zoho actually interprets `from_time`
in the *org's* zone and treats `timezone` as display metadata, every booking from a
signer outside Pacific lands at the wrong hour. Confirm during step 0 by booking a test
appointment with a deliberately non-org `timezone` and checking where it lands on the
notary's calendar.

**2. "Insert the hold in the same transaction that creates the payment session" is not
literally achievable** — a database transaction cannot span an HTTP call to Zoho. The
order that gets the same guarantee:

1. `claim_slot_hold(...)` with `payment_session_id` null → no row means 409, stop.
2. Create the Zoho payment session.
3. Update the hold with the returned `payment_session_id`.

If step 2 fails, the hold is orphaned but expires on its own in ten minutes. No
compensating delete needed, which is the same reasoning the spec already uses for
abandoned checkouts.

**3. Hold TTL vs payment session lifetime.** The hold is 10 minutes. If a Zoho payment
session stays valid longer, a customer can pay at minute 20 against a hold that lapsed
at minute 10 — the slot may have gone, and the re-check-then-refund path fires. That
path exists and works, but it turns a slow customer into a refund and an ops alert.
Worth checking Zoho's session expiry and setting the TTL to match it rather than
leaving a silent window.

**4. Cancellation refunds.** The brief recommends auto-refund on every cancellation and
the reasoning holds — at $25, a no-show policy costs more in disputes and ops time than
it recovers, and it is consistent with a page whose pitch is that nobody gets chased for
money. Worth an explicit yes from Kimberly before build, since it is a fee-policy
decision rather than a technical one.

---

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

## Next increment

1. `/book-beta` shell — `noindex` meta plus an `X-Robots-Tag` header in `vercel.json`.
   Not a `robots.txt` disallow: a disallowed URL can still be indexed from an external
   link, and blocking the crawl means it never reads the `noindex`.
2. `/api/availability` with the Zoho token cache, written against the documented shapes
   and unit-tested with recorded fixtures, so it is ready the moment credentials exist.
3. The calendar UI — 14-day list on mobile, grid on desktop, brand chips (Bordeaux fill
   with Bone text for selected, Bone with Bordeaux text and a Rule border for available,
   unavailable omitted). Testable here without any Zoho access against fixture data.
