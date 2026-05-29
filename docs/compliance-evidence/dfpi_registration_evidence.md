# DFPI Registration Evidence

> **Phase D compliance evidence — scaffold, pending external artifacts (Q-A5).** Holds the
> California DFPI (Department of Financial Protection and Innovation) registration evidence for
> Cornerstone's operating entities. The artifacts here are largely **external documents** that
> the compliance owner attaches; the engineering role is to provide the supporting data exports.
>
> **Date:** 2026-05-29 · **Reviewer:** Kimberly Uptain (TBC).

---

## 1. Requirement

Entities providing debt-resolution services to California consumers must be registered with the
DFPI and operate within the registration's terms. Examination evidence typically includes the
registration record, the entities covered, and demonstration that operational data
(clients, money flow) is segregated and auditable per entity.

## 2. What Cornerstone supplies

| Examiner need                        | Control / data                                                                                            | Where                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Per-entity (tenant) data segregation | RLS, 95/95 tables, verified                                                                               | `rls_audit_report.md`                         |
| Entity model                         | `companies` (`company_type`: law_firm / affiliate / financing_company), hierarchy via `parent_company_id` | A3                                            |
| Money-flow auditability              | `settlements`, `transactions`, reconciliation tables                                                      | A5/A6, see `bar_trust_accounting_evidence.md` |
| Change auditability                  | `system_audit_log`, incl. `company.type_changed`                                                          | A3/A11.1                                      |

## 3. Evidence to attach (external — compliance owner)

1. The DFPI registration certificate(s) and covered-entity list.
2. Mapping of each registered entity to its Cornerstone `companies` row (`id`, `company_type`).
3. Examination-period data exports as requested (per-tenant), produced via the service role.

## 4. Gaps / open items

- This artifact is **document-led**, not code-led: the registration records are external and
  must be supplied by the compliance owner. Engineering provides the per-tenant exports on
  request. **No engineering blocker; pending the external documents and reviewer.**
