-- Notaryous booking calendar — refund tracking
--
-- Auto-refund is now settled policy for both cancellation and no-show, and it is
-- an INTERNAL OPERATING PRACTICE with no customer-facing copy. Nothing on the
-- site promises it; the fee placard's refund line is deleted at cutover.
--
-- That makes this table the only record of why money went back. Without a
-- reason column, "status = refunded" cannot answer the question ops will
-- actually ask: how many of these were slots we lost versus sessions the signer
-- never showed up for. Those are different problems with different fixes.
--
-- Apply with: supabase db execute -f db/003_refund_tracking.sql

alter table public.bookings
  add column if not exists refund_reason text,
  add column if not exists refunded_at   timestamptz,
  add column if not exists refund_id     text;

-- 'slot_lost'    — the re-check before booking found the slot gone. Our fault
--                  or a staff member booking directly in the Zoho UI.
-- 'cancellation' — cancelled in Zoho, Flow told us.
-- 'noshow'       — the notary marked the appointment noshow.
-- 'manual'       — ops refunded by hand. Always allowed; never assume the set
--                  above is exhaustive of what a human will need to do.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_refund_reason_check'
  ) then
    alter table public.bookings
      add constraint bookings_refund_reason_check
      check (refund_reason is null or refund_reason in
             ('slot_lost','cancellation','noshow','manual'));
  end if;
end $$;

-- A refund without a reason is a row nobody can act on later, and a reason
-- without a refund is a lie. Keep them in lockstep, the same way
-- failure_reason is tied to status = 'failed'.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_refund_reason_iff_refunded'
  ) then
    alter table public.bookings
      add constraint bookings_refund_reason_iff_refunded
      check ((status = 'refunded') = (refund_reason is not null));
  end if;
end $$;

-- Reconciliation asks "any confirmed payment with neither an appointment nor a
-- refund". This is the second half of that question.
create index if not exists bookings_refunds_idx
  on public.bookings (refunded_at, refund_reason)
  where status = 'refunded';

comment on column public.bookings.refund_reason is
  'Why money went back: slot_lost | cancellation | noshow | manual. Internal only — no customer-facing copy states a refund policy.';
