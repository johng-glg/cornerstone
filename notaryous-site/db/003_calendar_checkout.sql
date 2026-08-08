-- Notaryous booking calendar — checkout support
--
-- TARGET: the glg-ron Supabase project (ref xatqfliscgqswiohzkps).
-- Additive. Brings a database created by an earlier 002 up to date, and adds
-- the one function /api/confirm depends on.
--
-- Apply with:
--   supabase db execute -f db/003_calendar_checkout.sql --project-ref xatqfliscgqswiohzkps
--
-- Running 002 (which now creates the 17-minute default directly) followed by
-- this file on a fresh database is a no-op for the ALTER below.

-- ---------------------------------------------------------------------------
-- Hold TTL: 10 → 17 minutes
-- ---------------------------------------------------------------------------
-- Measured, not assumed: a Zoho Payments create-session response returned
-- created_time 1786227520 and expiry_time 1786228420 — exactly 900 seconds.
-- The hold has to outlive the session it guards, or the customer can still pay
-- against a slot somebody else has taken.
alter table public.slot_holds
  alter column expires_at set default now() + interval '17 minutes';

-- ---------------------------------------------------------------------------
-- Durable record of "money taken, appointment not yet created"
-- ---------------------------------------------------------------------------
-- The one state neither table could previously represent. Between the payment
-- clearing and Book Appointment returning, the customer has paid and nothing
-- anywhere says so: ron_sessions is keyed on a booking_id that does not exist
-- yet, so no row can be written until Zoho answers.
--
-- The hold is the only thing that exists at that moment, so the payment is
-- recorded against it before Book Appointment is called. If that call fails,
-- this is the record ops reconciles against.
alter table public.slot_holds
  add column if not exists payment_id  text,
  add column if not exists paid_at     timestamptz,
  add column if not exists booking_id  text;   -- set once Zoho returns; null = unresolved

comment on column public.slot_holds.paid_at is
  'Set immediately before Book Appointment is called. A row with paid_at and no booking_id is a customer who paid and has no appointment — the highest-severity state in this system.';

-- The query ops runs, and reconciliation alerts on.
create index if not exists slot_holds_paid_unresolved_idx
  on public.slot_holds (paid_at)
  where paid_at is not null and booking_id is null;

-- Purge must never delete an unresolved paid hold. Expiry frees the slot;
-- deletion throws away the only evidence a refund is owed.
create or replace function public.purge_expired_slot_holds()
returns integer language plpgsql as $$
declare n integer;
begin
  delete from public.slot_holds
   where created_at < now() - interval '24 hours'
     and (paid_at is null or booking_id is not null);
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- record_calendar_booking — the handoff, safe in either order
-- ---------------------------------------------------------------------------
-- After Book Appointment succeeds, TWO writers race for the same ron_sessions
-- row: this function, and glg-ron-orchestration's insertBooking() reacting to
-- the Zoho Flow. Either can arrive first, and the outcome must be correct
-- both ways.
--
-- On INSERT, session_status is 'awaiting_payment'. That looks wrong — we know
-- the payment cleared — and it is load-bearing. handleBooking()'s duplicate
-- branch creates the BlueNotary session ONLY when it finds an existing row
-- with session_status = 'awaiting_payment':
--
--     if (paid && !row.bn_session_id && row.session_status === 'awaiting_payment')
--       return { row: await handlePaymentConfirmed(b.booking_id, b), ... };
--     return { row, deduped: true };            // ← does nothing at all
--
-- Insert 'pending_creation' instead and the Flow falls through to the second
-- line: a paid booking, an appointment on a notary's calendar, and no
-- BlueNotary session, silently, forever. Read 'awaiting_payment' here as
-- "awaiting session creation".
--
-- On CONFLICT, payment_status and session_status are deliberately NOT touched.
-- If the Flow got here first the orchestration service already owns those, and
-- overwriting them would drag a live session back to a state it has left.
create or replace function public.record_calendar_booking(
  p_booking_id         text,
  p_payment_session_id text,
  p_payment_id         text,
  p_zoho_staff_id      text,
  p_scheduled_at       timestamptz,
  p_client_email       text,
  p_client_first_name  text,
  p_client_last_name   text,
  p_client_phone       text,
  p_client_timezone    text,
  p_is_test            boolean default false
) returns public.ron_sessions
language sql as $$
  insert into public.ron_sessions (
    booking_id, payment_session_id, payment_id, zoho_staff_id, scheduled_at,
    client_email, client_first_name, client_last_name, client_name,
    client_phone, client_timezone, is_test, payment_status, session_status
  ) values (
    p_booking_id, p_payment_session_id, p_payment_id, p_zoho_staff_id, p_scheduled_at,
    lower(p_client_email), coalesce(p_client_first_name, ''), coalesce(p_client_last_name, ''),
    nullif(btrim(coalesce(p_client_first_name, '') || ' ' || coalesce(p_client_last_name, '')), ''),
    p_client_phone, p_client_timezone, coalesce(p_is_test, false),
    'cleared', 'awaiting_payment'
  )
  on conflict (booking_id) do update set
    payment_session_id = coalesce(public.ron_sessions.payment_session_id, excluded.payment_session_id),
    payment_id         = coalesce(public.ron_sessions.payment_id,         excluded.payment_id),
    zoho_staff_id      = coalesce(public.ron_sessions.zoho_staff_id,      excluded.zoho_staff_id),
    client_phone       = coalesce(public.ron_sessions.client_phone,       excluded.client_phone),
    client_timezone    = coalesce(public.ron_sessions.client_timezone,    excluded.client_timezone),
    is_test            = public.ron_sessions.is_test or excluded.is_test,
    updated_at         = now()
  returning *;
$$;

comment on function public.record_calendar_booking is
  'Idempotent handoff from the calendar to ron_sessions. Safe whether this or the Zoho Flow writes first. Never overwrites payment_status or session_status on conflict.';
