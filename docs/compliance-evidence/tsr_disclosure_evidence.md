# FTC TSR §310.3(a)(1) Disclosure-Capture Evidence

> **Phase D compliance evidence — scaffold, pending sign-off (Q-A5).** Maps the FTC Telemarketing
> Sales Rule material-disclosure requirement to the controls in Cornerstone that capture and
> retain those disclosures. Engineering substrate is in place; reviewer attestation and
> confirmation of required evidence format are pending.
>
> **Date:** 2026-05-29 · **Reviewer:** Kimberly Uptain (TBC).

---

## 1. Requirement

FTC TSR **§310.3(a)(1)** requires that, before a customer consents to pay for
debt-relief/telemarketed services, specified material information is disclosed truthfully. For a
debt-resolution practice this includes the nature/cost/terms of service and material conditions.
The compliance need: **prove, per client, that the required disclosures were presented and
acknowledged, with a timestamp, and that the record is tamper-evident.**

## 2. Controls in Cornerstone

| Requirement element                 | Control / data                                                                                               | Where        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------ |
| Disclosure presented & acknowledged | `lead_disclosures` (`lead_id`, `disclosure_type`, `acknowledged_at`), unique on `(lead_id, disclosure_type)` | A9 migration |
| Consent to contact (TCPA-adjacent)  | `clients.tcpa_consent` + `clients.tcpa_consent_date`                                                         | A5 migration |
| Service terms captured              | `services` catalog + `client_services` engagement record                                                     | A5           |
| Tamper-evidence                     | `system_audit_log` via `audit_trigger_fn`; reveals/changes logged                                            | A3           |
| Tenant isolation of the records     | RLS (see `rls_audit_report.md`)                                                                              | all          |

## 3. Evidence the reviewer needs to attach

1. The canonical list of `disclosure_type` values that satisfy §310.3(a)(1), confirmed by
   counsel, and confirmation that the UI presents each before consent.
2. A sample export: for a representative client, the `lead_disclosures` rows + `tcpa_consent_*`
   - the matching `system_audit_log` entries, demonstrating capture + timestamp + immutability.
3. Confirmation of the retention period and that it is enforced.

## 4. Gaps / open items

- The **enumerated disclosure set** is not yet encoded as a constraint/enum — `disclosure_type`
  is free text. If counsel fixes the required set, encoding it as an enum (forward-only
  migration) would make completeness checkable in CI. **Flagged for sign-off.**
- UI presentation flow evidence (screenshots/recordings) is owed once the disclosure set is
  confirmed.
