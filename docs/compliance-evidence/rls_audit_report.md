# RLS Policy Audit Report

> **Phase D compliance evidence.** Reviews every Row-Level Security policy against its documented
> intent: tenant isolation, role gating, and PII protection. Backs the bar-defensibility and
> DFPI-examination posture.
>
> **Date:** 2026-05-29 · **Status:** Engineering-complete; **pending compliance sign-off** (Q-A5,
> Kimberly Uptain). · **Verification:** automated, in the CI `db-verify` job.

---

## 1. Scope and method

Cornerstone is a multi-tenant case-management platform; the security model rests on Postgres RLS
enforcing that a tenant can only ever see and mutate its own data, with additional gates for role
and PII. This report audits the policy surface as of the Phase D migration set
(`20260529090000` … `20260529190000`).

**Method.** Policy intent is verified two ways:

1. **Structural** — every `public` table is confirmed RLS-enabled; policy bodies are reviewed
   against the access-helper functions they call.
2. **Behavioral** — `tests/db/rls_isolation.test.sql` (21 assertion groups) exercises the
   policies against real fixtures in two isolated tenants under the `authenticated` role, in the
   CI `db-verify` job, on every PR. This report's claims are the assertions that suite makes.

## 2. Coverage (measured on the applied schema)

| Metric                        | Value         |
| ----------------------------- | ------------- |
| `public` tables               | 95            |
| Tables with RLS **enabled**   | **95 (100%)** |
| Tables with RLS disabled      | **0**         |
| Live policies (`pg_policies`) | 212           |

The 100%-enabled figure is asserted live: a query over `pg_class.relrowsecurity` for all
`public` base tables returns zero rows with RLS disabled. The newest table,
`rate_limit_counters` (Phase D), is RLS-enabled with **no** policies by design — only the
service role (which bypasses RLS) touches it, so authenticated/anon receive nothing.

## 3. The isolation model

All tenant-scoped policies resolve the caller's tenant through a small set of
`SECURITY DEFINER` helper functions, never by trusting client input:

| Helper                                | Role in the model                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| `get_user_company_id()`               | The caller's tenant, from `staff` keyed by `auth.uid()`.                                 |
| `can_access_company(user, company)`   | Tenant-membership check; the backbone of every `USING`/`WITH CHECK` clause.              |
| `has_role(user, role)`                | Role gate for admin-only tables and mutations.                                           |
| `can_view_leads(user, company)`       | Paralegal lead-visibility gate, driven by the `leads.paralegal_visibility` feature flag. |
| `can_access_storage_object(...)`      | Path-scoped Storage object access (private buckets).                                     |
| `resolve_entity_company_id(type, id)` | Resolves a polymorphic entity (notes, communications) to its owning tenant.              |

Because these are `SECURITY DEFINER` with a pinned `search_path`, RLS decisions cannot be
subverted by a caller manipulating their own `staff`/role rows within RLS.

## 4. Verified properties (each is an automated assertion)

| #   | Property                                                                                          | Evidence (test group)               |
| --- | ------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | A user can access their own tenant; cross-tenant access is denied                                 | `can_access_company` isolation (G1) |
| 2   | Role checks resolve correctly (admin vs non-admin)                                                | `has_role` (G2)                     |
| 3   | Feature flags + `user_roles` are own-tenant/own-row only                                          | G3+5                                |
| 4   | Non-admins cannot write admin-only tables (feature flags)                                         | G4                                  |
| 5   | PII encrypt/decrypt round-trips; `anon` cannot execute PII functions                              | G6a/G6b                             |
| 6   | Audit triggers fire on sensitive mutations                                                        | G7, G19                             |
| 7   | Core-CRM (clients/leads) is cross-tenant isolated                                                 | G9                                  |
| 8   | Paralegal lead visibility is gated by the feature flag                                            | G10a/G10b                           |
| 9   | Per-tenant processor configs are admin-only **and** company-scoped                                | G12                                 |
| 10  | Processor credentials decrypt only for the service role                                           | G13                                 |
| 11  | Integrations / Dialpad calls are cross-tenant isolated; admin-only mutate                         | G14                                 |
| 12  | Litigation matters are company-scoped; filing-fee writes are matter-scoped; cross-tenant denied   | G15                                 |
| 13  | Lead/workflow engine objects are company-scoped; assignments are staff(company)-scoped            | G16                                 |
| 14  | Templates/signatures company-scoped; notifications user-scoped; notes resolve via entity resolver | G17                                 |
| 15  | Billing/tasks company-scoped; task templates globally readable by staff                           | G18                                 |
| 16  | **Rate limiter** allow/deny/per-identifier; service-role-only                                     | G20 (Phase D)                       |
| 17  | **No plaintext PII** in deprecated columns; verifier is service-role-only                         | G21 (Phase D)                       |

## 5. PII protection posture

- Current PII lives **only** in `*_ciphertext` (bytea) columns, written via `encrypt_pii()`
  (vault-keyed `pgp_sym_encrypt`, `extensions`-qualified, pinned `search_path`).
- Decrypt helpers (`decrypt_client_ssn`, `decrypt_lead_banking`,
  `decrypt_processor_credentials`) are `SECURITY DEFINER`, log every reveal to
  `system_audit_log`, and are not executable by `anon`; credential decryption is
  **service-role-only**.
- The deprecated pre-Phase-2A plaintext columns (`clients.ssn_encrypted`,
  `lead_banking.account_number_encrypted`, `lead_banking.routing_number_encrypted`) must hold
  no data. `public.assert_no_plaintext_pii()` (Phase D) proves this and is asserted in CI
  (G21). See `ssn_backfill_evidence.md`.

## 6. Known limitations / accepted items

- **Physical column ordering of `staff`** differs from the Lovable reference (documented in
  `phase_A_summary.md` §3). Logical schema is identical; no security impact.
- **Sign-off pending (Q-A5).** This report is engineering-complete and automatically verified.
  Compliance attestation by the named reviewer (Kimberly Uptain) is the remaining step;
  see `docs/compliance-evidence/README.md`.

## 7. How to re-verify

```bash
# Locally (Path A) or in the CI db-verify job:
psql "$DB_URL" -v ON_ERROR_STOP=1 -f tests/db/rls_isolation.test.sql
# All 21 groups must print PASS and the script must exit 0.
```
