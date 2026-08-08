-- Notaryous booking calendar — slot_holds
--
-- A local, authoritative hold on a slot for the ~10 minutes a checkout is open.
-- Zoho has no hold API, and holding by creating a placeholder appointment would
-- fire the BlueNotary Flow on every abandoned checkout — which, given the Flow
-- sends a hardcoded payment reference, would create a real BlueNotary session
-- for every abandoned basket.
--
-- TARGET: the glg-ron Supabase project (ref xatqfliscgqswiohzkps), the same
-- project glg-ron-orchestration uses. This table is new and calendar-owned;
-- nothing in the orchestration service reads it.
--
-- Apply with:
--   supabase db execute -f db/002_slot_holds.sql --project-ref xatqfliscgqswiohzkps
--
-- NOTE ON staff_id: this is a Zoho Bookings staff record id, the same namespace
-- as ron_sessions.zoho_staff_id — NOT a notary email. See the note at the foot
-- of 001_ron_sessions_calendar.sql for why those are two different things.

-- gen_random_uuid() is core Postgres since 13 — no pgcrypto extension needed.
create table if not exists public.slot_holds (
  id                 uuid        primary key default gen_random_uuid(),
  slot_start_utc     timestamptz not null,
  staff_id           text        not null,
  payment_session_id text        unique,           -- null until the session is created
  expires_at         timestamptz not null default now() + interval '10 minutes',
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- THE INDEX — read this before changing it
-- ---------------------------------------------------------------------------
-- The spec asks for:
--
--   create unique index on slot_holds (slot_start_utc, staff_id)
--     where expires_at > now();
--
-- Postgres rejects that outright:
--
--   ERROR: functions in index predicate must be marked IMMUTABLE
--
-- now() is STABLE, not IMMUTABLE, and index predicates must be IMMUTABLE — an
-- index cannot have a membership rule that changes as the clock moves, because
-- nothing would re-index the rows as they age out. Verified against PostgreSQL
-- 18; it is not a version quirk.
--
-- So the uniqueness is unconditional, and expiry is handled at write time by
-- the claim statement below. That keeps the guarantee where the spec wants it —
-- enforced by the database, never check-then-insert in application code.
create unique index if not exists slot_holds_slot_staff_key
  on public.slot_holds (slot_start_utc, staff_id);

-- Availability subtracts live holds; this serves that filter.
create index if not exists slot_holds_live_idx
  on public.slot_holds (slot_start_utc, expires_at);

-- ---------------------------------------------------------------------------
-- Claiming a hold — one statement, atomic, no read-then-write
-- ---------------------------------------------------------------------------
-- Returns one row if the caller now holds the slot, and zero rows if a live
-- hold already exists (the API turns zero rows into a 409). The WHERE on the
-- DO UPDATE is what makes it safe: an existing row is only taken over when it
-- has already expired.
create or replace function public.claim_slot_hold(
  p_slot_start_utc     timestamptz,
  p_staff_id           text,
  p_payment_session_id text default null,
  p_ttl                interval default interval '10 minutes'
) returns public.slot_holds
language sql as $$
  insert into public.slot_holds (slot_start_utc, staff_id, payment_session_id, expires_at)
  values (p_slot_start_utc, p_staff_id, p_payment_session_id, now() + p_ttl)
  on conflict (slot_start_utc, staff_id) do update
     set payment_session_id = excluded.payment_session_id,
         expires_at         = excluded.expires_at,
         created_at         = now()
   where slot_holds.expires_at <= now()      -- only take over a dead hold
  returning *;
$$;

comment on function public.claim_slot_hold is
  'Atomically claim a slot. Returns the hold row, or no row if a live hold exists (caller returns 409). Never check-then-insert around this.';

-- Table hygiene only. Expiry is what frees a slot, not deletion, so this is not
-- load-bearing and can be skipped without affecting correctness.
create or replace function public.purge_expired_slot_holds()
returns integer language plpgsql as $$
declare n integer;
begin
  delete from public.slot_holds where created_at < now() - interval '24 hours';
  get diagnostics n = row_count;
  return n;
end $$;

alter table public.slot_holds enable row level security;

comment on table public.slot_holds is
  'Short-lived local holds. A slot is free when no row for it has expires_at > now(). Service-role access only.';
