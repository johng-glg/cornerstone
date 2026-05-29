# Bar Trust-Accounting Evidence

> **Phase D compliance evidence — scaffold, pending sign-off (Q-A5).** Maps attorney
> trust-accounting (IOLTA / client-funds) obligations to the money-flow controls in Cornerstone.
> Engineering substrate is in place; reviewer attestation pending.
>
> **Date:** 2026-05-29 · **Reviewer:** Kimberly Uptain (TBC).

---

## 1. Requirement

Law-firm tenants holding client funds must maintain trust-accounting integrity: client funds
segregated and tracked, every movement recorded and reconcilable, no commingling, and a complete
audit trail — defensible under bar discipline review.

## 2. Controls in Cornerstone

| Obligation                  | Control / data                                                                                 | Where                           |
| --------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| Per-client funds tracking   | `client_services`, `settlements`, `transactions`                                               | A5                              |
| Movement recording          | `transactions` (+ processor `payment_schedules`); PLSA routing through the adapter             | A5/A6                           |
| Reconciliation              | `reconciliation_findings`, `plsa_sync_log`, `plsa-reconciliation`/`plsa-escrow-sync` functions | A6                              |
| No cross-tenant commingling | RLS, money tables company-scoped + verified                                                    | `rls_audit_report.md` (G15/G18) |
| Audit trail                 | `system_audit_log` on sensitive mutations                                                      | A3                              |
| Money-handling integrity    | 100% test-coverage bar on money flow (contributor guide)                                       | CI coverage gate                |

## 3. Evidence the reviewer needs to attach

1. Confirmation that the `settlements`/`transactions` model maps to the firm's trust-accounting
   ledger requirements (account types, allowable movements).
2. A reconciliation sample: a period's `transactions` vs processor records, with
   `reconciliation_findings` showing discrepancies caught and resolved.
3. Confirmation that the 100%-coverage money-flow tests cover the bar-relevant invariants
   (no negative balances, no cross-client movement, every movement audited).

## 4. Gaps / open items

- **Trust-ledger reconciliation dashboard** (daily) is a **Phase G** deliverable; until then,
  reconciliation is function-driven and queryable but not surfaced as a standing dashboard.
- Mapping of the internal money model to the specific bar trust-accounting rule set needs
  counsel confirmation. **Flagged for sign-off.**
