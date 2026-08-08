-- Notaryous booking calendar — bookings
--
-- One row per payment session. This table is the record of "money cleared", and
-- zoho_booking_id is the record of "appointment exists". The non-negotiable
-- constraint is that the second never happens without the first, so the row is
-- written at payment confirmation and updated when Zoho confirms the booking.
--
-- Apply with: supabase db execute -f db/001_bookings.sql   (or the SQL editor)

-- gen_random_uuid() is core Postgres since 13 — no pgcrypto extension needed.
create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),

  -- Idempotency key. Zoho Payments webhooks retry; a duplicate delivery must
  -- collide here rather than create a second appointment.
  payment_session_id  text        not null unique,
  payment_id          text,                        -- set on success, used for refunds

  slot_start_utc      timestamptz not null,
  timezone            text        not null,        -- signer's IANA zone, e.g. America/Los_Angeles

  customer_name       text        not null,
  customer_email      text        not null,
  customer_phone      text,

  zoho_booking_id     text,                        -- null until Zoho confirms
  zoho_summary_url    text,

  status              text        not null default 'paid'
                      check (status in ('paid','booked','refunded','failed')),
  failure_reason      text,

  -- Beta rows. Set true for everything created against the sandbox so they are
  -- trivially excluded from reporting and can be archived after cutover.
  is_test             boolean     not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- failure_reason is meaningless unless something failed, and a failure with
  -- no reason is the thing that wastes an hour at 2am.
  constraint bookings_failure_reason_iff_failed
    check ((status = 'failed') = (failure_reason is not null))
);

-- Reconciliation reads this constantly: "paid for >15 minutes with no
-- zoho_booking_id" is the alert that catches a silent booking failure.
create index if not exists bookings_unbooked_idx
  on public.bookings (created_at)
  where zoho_booking_id is null;

create index if not exists bookings_zoho_booking_id_idx
  on public.bookings (zoho_booking_id)
  where zoho_booking_id is not null;

create index if not exists bookings_slot_idx
  on public.bookings (slot_start_utc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- This table holds customer names, emails and phone numbers. RLS on with no
-- policies means anon and authenticated can read nothing; the serverless
-- functions use the service role key, which bypasses RLS. If a publishable key
-- ever leaks, it reads zero rows of PII.
alter table public.bookings enable row level security;

comment on table public.bookings is
  'One row per Zoho Payments session. Written on server-side payment confirmation; zoho_booking_id set once the appointment exists. Service-role access only.';
