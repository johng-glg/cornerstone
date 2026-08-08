-- Notaryous booking calendar — extend ron_sessions for calendar-owned bookings
--
-- TARGET: the glg-ron Supabase project (ref xatqfliscgqswiohzkps), shared with
-- glg-ron-orchestration. This ALTERs a live table that a load-bearing service
-- reads on every webhook, so everything here is additive: new nullable columns,
-- new indexes, and constraints that can only reference the new columns. No
-- existing column is altered, no object is dropped.
--
-- Supersedes the standalone `bookings` table from the first spec, which was
-- never created in any project. ron_sessions is the single row per booking.
--
-- REVIEW BEFORE RUNNING. Apply with:
--   supabase db execute -f db/001_ron_sessions_calendar.sql --project-ref xatqfliscgqswiohzkps
--
-- After it runs, re-dump glg-ron-orchestration/supabase/schema.sql so the two
-- repos do not drift.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.ron_sessions
  -- Payment, taken by the calendar BEFORE the Zoho appointment is created.
  -- The orchestration service cannot tell a paid booking from an unpaid one —
  -- the Zoho Flow sends a hardcoded payment reference, so paymentSignal()
  -- returns 'paid' unconditionally. These columns are the only real record
  -- that money changed hands.
  add column if not exists payment_session_id text,
  add column if not exists payment_id         text,

  -- The signer's own IANA zone. The Flow has always sent time_zone and nothing
  -- has ever stored it; scheduled_at is a timestamptz, so it keeps the instant
  -- but loses the zone the signer chose it in. Confirmation pages and emails
  -- need to say "11:00 am Pacific", not a UTC instant.
  add column if not exists client_timezone    text,
  add column if not exists client_phone       text,

  -- Which Zoho staff record holds the appointment. NOT the same identifier as
  -- notary_email — see the note at the foot of this file.
  add column if not exists zoho_staff_id      text,

  -- Refund tracking. Auto-refund on cancellation and no-show is settled policy
  -- and is an internal operating practice with no customer-facing copy, which
  -- makes these columns the only record of why money went back.
  add column if not exists refund_reason      text,
  add column if not exists refunded_at        timestamptz,
  add column if not exists refund_id          text,

  -- Beta and probe rows, so they can be excluded from reporting. The two step 0
  -- probe bookings are why this is not hypothetical. Nullable with a default:
  -- on PG11+ ADD COLUMN with a non-volatile default does not rewrite the table,
  -- and existing rows read as false.
  add column if not exists is_test            boolean default false;

-- ---------------------------------------------------------------------------
-- Constraints
-- ---------------------------------------------------------------------------
-- Both reference ONLY columns added above, which are NULL on every existing
-- row by construction. Validation cannot fail, so these are added validated
-- rather than NOT VALID — there is nothing for a later VALIDATE to catch.
--
-- Deliberately NOT tied to session_status. A session can be completed and
-- refunded, or expired and refunded; conflating "what happened in the session"
-- with "did money go back" would make one of them unrepresentable.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ron_sessions'::regclass
      and conname  = 'ron_sessions_refund_reason_check'
  ) then
    alter table public.ron_sessions
      add constraint ron_sessions_refund_reason_check
      check (refund_reason is null or refund_reason in
             ('cancellation', 'no_show', 'platform_failure', 'manual'));
  end if;

  -- A refund with no reason is a row nobody can act on later; a reason with no
  -- refund is a lie. refund_id is deliberately not in this pairing — a manual
  -- refund made outside the processor may not have one.
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ron_sessions'::regclass
      and conname  = 'ron_sessions_refund_pairing_check'
  ) then
    alter table public.ron_sessions
      add constraint ron_sessions_refund_pairing_check
      check ((refund_reason is null) = (refunded_at is null));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Idempotency for Zoho Payments: a duplicate confirmation must collide here
-- rather than produce a second appointment. Partial, so the 24 pre-calendar
-- rows stay out of the index entirely.
create unique index if not exists ron_sessions_payment_session_key
  on public.ron_sessions (payment_session_id)
  where payment_session_id is not null;

-- Availability subtracts sold slots on every calendar load. Excludes only
-- 'cancelled': every other status means the Zoho appointment still exists and
-- the slot is not free. Erring toward "taken" costs an offered slot; erring
-- the other way double-books a notary.
create index if not exists ron_sessions_slot_idx
  on public.ron_sessions (scheduled_at)
  where session_status <> 'cancelled';

-- Ops: "which refunds went out, and why".
create index if not exists ron_sessions_refunds_idx
  on public.ron_sessions (refunded_at, refund_reason)
  where refunded_at is not null;

-- Reconciliation: paid, but the appointment never appeared. This is the query
-- that catches a Book Appointment call that failed after the card was charged.
create index if not exists ron_sessions_paid_unbooked_idx
  on public.ron_sessions (created_at)
  where payment_session_id is not null and bn_session_id is null;

-- ---------------------------------------------------------------------------
comment on column public.ron_sessions.payment_session_id is
  'Zoho Payments session id. Set by the calendar before the Zoho appointment is created. Null on every pre-calendar row.';
comment on column public.ron_sessions.payment_id is
  'Zoho Payments payment id. Required to issue a refund.';
comment on column public.ron_sessions.client_timezone is
  'IANA zone the signer chose the slot in. scheduled_at keeps the instant; this keeps the frame it was picked in.';
comment on column public.ron_sessions.zoho_staff_id is
  'Zoho Bookings staff id holding the appointment. NOT interchangeable with notary_email.';
comment on column public.ron_sessions.is_test is
  'Beta and probe rows. Exclude from reporting.';

-- ---------------------------------------------------------------------------
-- zoho_staff_id vs notary_email — read this before using either
-- ---------------------------------------------------------------------------
-- These are two different identifiers in two different namespaces, and the
-- system currently picks them INDEPENDENTLY:
--
--   zoho_staff_id  a Zoho Bookings staff record id. The calendar chooses it
--                  when it calls Book Appointment, and Zoho's availability is
--                  computed per staff id. This is what slot_holds.staff_id
--                  holds and what availability subtracts against.
--
--   notary_email   an address from NOTARY_ROSTER. glg-ron-orchestration's
--                  assignNotary() chooses it independently, by least open
--                  session load, when it creates the BlueNotary session.
--
-- Nothing maps one to the other. Until the calendar existed this did not
-- matter, because Zoho staff assignment came from the hosted booking page and
-- was never compared with the BlueNotary assignment. Once the calendar picks a
-- Zoho staff member, the two assignments can disagree: the appointment sits on
-- notary A's Zoho calendar while notary B is invited to the BlueNotary session.
--
-- This migration does not fix that — it only makes it visible, by recording
-- both. Resolving it means either mapping NOTARY_ROSTER entries to Zoho staff
-- ids, or having the calendar pass its chosen staff through to assignNotary.
-- That is a change to a live service and belongs in its own decision.
