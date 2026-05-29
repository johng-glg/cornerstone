# ADR-009 — PLSA Adapter Interface Contract

**Status:** Accepted
**Date:** 2026-05-27 (proposed) · **Ratified:** 2026-05-29
**Decision owner:** Program Manager (John G.)
**Authors:** Tony Rodriguez, Lisa Soria, Joe Duarte + new-processor team rep (TBD)
**Logged by:** Program Manager
**Ratification note:** Ratified by the PM/decision-owner on 2026-05-29 — ahead of the original
2026-06-17 target — because the contract is already implemented and exercised in Cornerstone:
the merged A6 `plsa-routing` dispatcher and `plsa-adapter-mock` conform to all 10 outbound
operations and 13 inbound events below, and the `check:zod`/`check:cors` gates hold the
edge layer to it. Freezing the interface now lets the new-processor team build against a
stable target immediately. **One external follow-up remains open:** the new-processor team
representative co-sign (rep to be named by 2026-06-03; co-sign target 2026-06-17). Their
sign-off confirms buildability from their side; it does not reopen the interface. Any change
to the contract from here requires an ADR revision and joint re-sign-off.

---

## Context

The 6-month Forth-decoupling sprint depends on two independently-built systems implementing the same adapter interface:

1. **`plsa-adapter-forth`** — wraps developer.setforth.com. Built by Cornerstone vendor + Lisa Soria.
2. **`plsa-adapter-{new}`** — wraps the new in-house/Sentry-affiliated PLSA processor. Built by Cornerstone team against a sandbox the new-processor team provides.

Forth has confirmed it will NOT cooperate with the new processor. The two providers have no direct integration; the only thing that knows both exist is `plsa-routing-service` in Cornerstone. This makes the adapter interface the program's single most important contract — if it's wrong, both adapters need to be rewritten and the cutover slips.

The Architecture Plan §5 defines the contract at the conceptual level (10 outbound operations, 12 canonical inbound events). This ADR commits to the specific interface signature, error semantics, idempotency model, and event payload shapes so both teams can build to it.

## Decision

Adopt the following interface contract, derived from Architecture Plan §5.1. **Ratified
2026-05-29** — frozen; changes require an ADR revision and joint re-sign-off.

### Outbound operations (CRM → Adapter)

| Operation | Request payload | Returns | Idempotency |
|---|---|---|---|
| `create_account` | engagement_id, primary_party_id, funding_source, account_metadata | `external_account_id`, `ack` | engagement_id |
| `update_account` | external_account_id, mutable_fields | `ack` | request_id |
| `close_account` | external_account_id, reason_code | `ack`, `final_balance` | external_account_id |
| `schedule_draft` | external_account_id, amount_cents, scheduled_date, funding_source | `external_draft_id`, `ack` | (account, scheduled_date, amount) |
| `modify_draft` | external_draft_id, new_amount_cents, new_scheduled_date | `ack` | request_id |
| `cancel_draft` | external_draft_id | `ack` | external_draft_id |
| `request_payment_to_creditor` | external_account_id, creditor_id, amount_cents, settlement_id | `external_payment_id`, `ack` | settlement_id |
| `place_hold` | external_account_id, reason_code, expected_release | `ack` | request_id |
| `release_hold` | external_account_id, hold_id | `ack` | hold_id |
| `fetch_balance` | external_account_id | `balance_snapshot` | (read; not idempotent-relevant) |

### Inbound events (Adapter → CRM)

Canonical event names, all carrying: `event_id`, `correlation_id`, `idempotency_key`, `provider_id`, `external_account_id`, `occurred_at`, payload-specific fields.

| Event | Payload-specific fields |
|---|---|
| `plsa.account_provisioned` | external_account_id |
| `plsa.account_closed` | external_account_id, final_balance |
| `plsa.draft_scheduled` | external_draft_id, scheduled_date, amount_cents |
| `plsa.draft_cleared` | external_draft_id, cleared_date, amount_cents |
| `plsa.draft_failed` | external_draft_id, reason_code (NSF, account closed, stop payment, invalid routing, other), reason_detail |
| `plsa.draft_returned` | external_draft_id, returned_date, return_reason |
| `plsa.payment_to_creditor_sent` | external_payment_id, settlement_id, amount_cents |
| `plsa.payment_to_creditor_cleared` | external_payment_id, cleared_date |
| `plsa.payment_to_creditor_failed` | external_payment_id, reason_code, reason_detail |
| `plsa.hold_placed` | hold_id, reason_code |
| `plsa.hold_released` | hold_id |
| `plsa.balance_snapshot_received` | balance_cents, as_of_timestamp |
| `plsa.account_alert_received` | alert_type, severity, detail |

### Error and degradation semantics

- Every operation has a 30-second timeout at the routing layer.
- Adapter exhausts retries with exponential backoff (30s, 90s, 300s) before raising.
- Three failure modes published to CRM: `provider_unavailable`, `provider_rejected`, `provider_timeout` — each with sufficient detail for retry policy decision.
- Idempotency keys are mandatory on all writes; replay-safe by design.

### Provider identifier discipline

- Every payload includes `provider_id` (literal: `forth` or `{new_processor_name}`).
- Cornerstone never assumes provider behavior based on `provider_id` — adapters encapsulate all provider-specific quirks.
- `provider_id` is reference data; adding a third provider in future is a config-only change at the routing layer.

## Alternatives Considered

**Adopt Architecture Plan §5.1 verbatim without further specification.** Rejected. The concept-level contract leaves error semantics, idempotency, and payload shapes underspecified. Two teams building to this will diverge.

**Use Forth's existing API shape as the interface (forth-passthrough).** Rejected outright. Couples the new processor to Forth's conventions and undoes the entire point of the adapter pattern.

**Use the new processor's API shape as the interface.** Rejected. The new processor doesn't exist yet; designing the interface around a moving target. Also implicitly couples Forth adapter to the new processor's evolving conventions.

**Define provider-specific subtypes (separate Forth interface vs new-processor interface).** Rejected. Defeats pluggability. Anything provider-specific belongs inside the adapter, not in the interface.

## Consequences

**Positive.**
- Both adapter teams build to a single spec. Sandbox testing on either side validates the interface independent of the other.
- A mock adapter for testing can be built immediately — Cornerstone's downstream services don't gate on either real provider being available.
- Adding a third provider in future requires only a new adapter, not changes to the CRM or routing layer.
- Adversarial Forth posture is contained: every Forth quirk lives inside `plsa-adapter-forth`. The rest of the platform is provider-agnostic.

**Negative.**
- Once ratified, changes to this contract trigger changes in both adapters and the routing layer. High change cost.
- Forth's actual API has quirks (sequential single-record debt creation, OFFER_STATUS = 10 = Completed semantics, per-credential-set routing) that have to be encapsulated cleanly. Risk of leakage if the adapter is rushed.

**This commits us to:**
- Ratify by 2026-06-17 (Phase A week 3). _(Met early — ratified 2026-05-29; see the ratification note above.)_
- Both adapter teams build to this spec; any deviation requires ADR revision and joint sign-off.
- Mock adapter as first deliverable — built before either real adapter is complete. _(Delivered in A6: `plsa-adapter-mock`.)_

## Status at ratification (2026-05-29)

- **Mock adapter delivered** (first-deliverable commitment met): `plsa-adapter-mock` returns
  ADR-009-shaped responses for every operation, so Cornerstone's downstream services are
  unblocked without either real provider. Merged in A6.
- **Routing layer conforms:** `plsa-routing` dispatches all 10 outbound operations with
  provider resolution (override→service→transaction→client→`forth`) and forwards caller auth;
  inbound events land via the `forth-*` adapters and `plsa_sync_log`. Merged in A6.
- **Provider-id discipline holds:** every payload carries `provider_id`; no Cornerstone code
  branches on it — provider quirks are encapsulated in `plsa-adapter-forth`.

## Open Follow-ups

- **New-processor team representative co-sign** — rep to be named by 2026-06-03; co-sign target
  2026-06-17. The only remaining external item; confirms buildability from their side and does
  not reopen the interface.
- Versioning policy: how do we evolve this interface without breaking either adapter mid-build?
- Schema registry (ADR-005, pending) — where does this contract live as enforceable schema?
