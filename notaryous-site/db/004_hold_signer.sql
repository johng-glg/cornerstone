-- Notaryous booking calendar — signer details move onto the hold
--
-- TARGET: the glg-ron Supabase project (ref xatqfliscgqswiohzkps).
--
-- Zoho Payments caps `meta_data` at FIVE entries (keys ≤20 chars, values ≤500).
-- The first live checkout sent nine and was rejected:
--
--   400 {"code":"error","message":"meta_data varies from the defined limit"}
--
-- So the booking context stops travelling through Zoho and lives here instead.
-- meta_data now carries one entry — `hold_id` — and /api/confirm reads
-- everything else off this row.
--
-- This is better than a workaround. Zoho's own documentation says not to put
-- personally identifiable information in meta_data; the round trip now carries
-- one opaque uuid instead of a name, an email and a phone number. The
-- "browser is never believed" property is unchanged and arguably stronger:
-- the client still supplies nothing but an opaque id, and the slot, notary and
-- signer are read from a row only the server has ever written.
--
-- Apply with:
--   supabase db execute -f db/004_hold_signer.sql --project-ref xatqfliscgqswiohzkps

alter table public.slot_holds
  add column if not exists client_email      text,
  add column if not exists client_first_name text,
  add column if not exists client_last_name  text,
  add column if not exists client_phone      text,
  add column if not exists client_timezone   text;

comment on column public.slot_holds.client_email is
  'Signer details are held here for the life of the checkout because Zoho Payments caps meta_data at 5 entries and documents that PII must not go in it. RLS is on with no policies; service role only.';

-- ---------------------------------------------------------------------------
-- claim_slot_hold gains the signer, and must be DROPPED first
-- ---------------------------------------------------------------------------
-- `create or replace` with a different argument list creates an OVERLOAD
-- rather than replacing, and two overloads both callable with four arguments
-- make PostgREST fail with "function is not unique". Drop, then create.
--
-- The signer travels with the claim rather than in a follow-up UPDATE so there
-- is never a moment where a hold exists without the details /api/confirm needs.
-- The claim is the contended operation; adding a second round trip after it
-- would open exactly the window this design exists to close.
drop function if exists public.claim_slot_hold(timestamptz, text, text, interval);

create or replace function public.claim_slot_hold(
  p_slot_start_utc     timestamptz,
  p_staff_id           text,
  p_payment_session_id text default null,
  p_ttl                interval default interval '17 minutes',
  p_client_email       text default null,
  p_client_first_name  text default null,
  p_client_last_name   text default null,
  p_client_phone       text default null,
  p_client_timezone    text default null
) returns public.slot_holds
language sql as $$
  insert into public.slot_holds (
    slot_start_utc, staff_id, payment_session_id, expires_at,
    client_email, client_first_name, client_last_name, client_phone, client_timezone
  )
  values (
    p_slot_start_utc, p_staff_id, p_payment_session_id, now() + p_ttl,
    lower(p_client_email), p_client_first_name, p_client_last_name, p_client_phone, p_client_timezone
  )
  on conflict (slot_start_utc, staff_id) do update
     set payment_session_id = excluded.payment_session_id,
         expires_at         = excluded.expires_at,
         created_at         = now(),
         -- Taking over a dead hold means a DIFFERENT customer now owns this
         -- slot. Their details replace the abandoned ones entirely; leaving a
         -- previous signer's email on a live hold would book the wrong person.
         client_email       = excluded.client_email,
         client_first_name  = excluded.client_first_name,
         client_last_name   = excluded.client_last_name,
         client_phone       = excluded.client_phone,
         client_timezone    = excluded.client_timezone,
         payment_id         = null,
         paid_at            = null,
         booking_id         = null
   where slot_holds.expires_at <= now()      -- only take over a dead hold
  returning *;
$$;

comment on function public.claim_slot_hold is
  'Atomically claim a slot, carrying the signer. Returns the hold row, or no row if a live hold exists (caller returns 409). Never check-then-insert around this.';
