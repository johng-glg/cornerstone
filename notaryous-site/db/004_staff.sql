-- Notaryous booking calendar — which notary took the appointment
--
-- 001 was written when the service had one notary and ZOHO_STAFF_ID named them.
-- That made a single person a hard dependency of every booking, so staff is now
-- resolved from the service and chosen at booking time. The consequence for
-- this table is that "which notary" is per-row data, not configuration.
--
-- Apply with: supabase db execute -f db/004_staff.sql   (or the SQL editor)

alter table public.bookings
  add column if not exists staff_id text;

comment on column public.bookings.staff_id is
  'Zoho staff id chosen at checkout. Null only on rows written before 004, and on failed/refunded rows that never reached a notary.';

-- A booked appointment exists on somebody's calendar. A row that says otherwise
-- is a row nobody can reconcile against Zoho.
--
-- NOT VALID skips the check against existing rows so this can be applied to a
-- live table without a full scan or a failure on pre-004 history; new and
-- updated rows are checked from the moment it is added.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.bookings'::regclass and conname = 'bookings_booked_has_staff'
  ) then
    alter table public.bookings
      add constraint bookings_booked_has_staff
      check (status <> 'booked' or staff_id is not null) not valid;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- The real defence against a double booking
-- ---------------------------------------------------------------------------
-- slot_holds stops two checkouts colliding, but a hold expires and a booking
-- does not. This makes "one notary, one slot" a database guarantee for anything
-- that has been paid for. Refunded and failed rows are excluded — those slots
-- are free again, and a cancelled 11:00 must be re-bookable.
--
-- Unlike the slot_holds predicate this one IS legal: `status` and `staff_id`
-- are columns, so the predicate is IMMUTABLE. See 002 for why now() is not.
create unique index if not exists bookings_slot_staff_live_key
  on public.bookings (slot_start_utc, staff_id)
  where status in ('paid', 'booked') and staff_id is not null;

-- Availability subtracts sold slots on every load; this serves that filter.
create index if not exists bookings_live_slots_idx
  on public.bookings (slot_start_utc)
  where status in ('paid', 'booked');
