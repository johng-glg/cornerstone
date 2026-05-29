# Security Overview

> **Phase D deliverable.** Threat model, isolation model, audit trail, encryption posture,
> incident-response posture, and known limitations for Cornerstone. Companion to
> `compliance-evidence/rls_audit_report.md`.
>
> **Date:** 2026-05-29 · **Status:** Published; compliance sign-off pending (Q-A5).

---

## 1. System and trust boundaries

Cornerstone is a multi-tenant case-management platform: a React/TypeScript SPA, a Supabase
Postgres backend (Auth, Storage, RLS), and Deno edge functions that broker external integrations
(Forth/PLSA, DocuSeal, Dialpad). Trust boundaries:

| Boundary                                              | Control                                                                                                  |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Browser → Supabase                                    | Supabase Auth (JWT); RLS enforces tenant/row scope on every query.                                       |
| Browser/caller → edge function                        | `requireAuth` (JWT or service-role); Zod input validation; restricted CORS; **rate limiting (Phase D)**. |
| Edge function → external API (Forth/DocuSeal/Dialpad) | Per-tenant or platform secrets from the secret manager; never in source.                                 |
| External → webhook endpoint                           | HMAC signature verification is the trust boundary; **IP rate-limited before HMAC (Phase D)**.            |
| Any → PII                                             | Vault-keyed encryption; decryption gated + audit-logged; credentials service-role-only.                  |

## 2. Tenant isolation model

Postgres RLS is the primary isolation control: **100% of `public` tables are RLS-enabled (95/95),
212 live policies**, all resolving the caller's tenant through `SECURITY DEFINER` helpers
(`can_access_company`, `get_user_company_id`, `has_role`, …) rather than client input. Verified
behaviorally by `tests/db/rls_isolation.test.sql` (21 groups) in CI on every PR. Full detail in
`compliance-evidence/rls_audit_report.md`.

Admin **view-only impersonation** never changes RLS scope — it is a UI lens, not a privilege
escalation.

## 3. Encryption posture

- **PII at rest:** SSNs and bank account/routing numbers are stored only as `*_ciphertext`
  (bytea), encrypted via `encrypt_pii()` → `extensions.pgp_sym_encrypt` with a Supabase Vault
  key and pinned `search_path`. No plaintext PII columns are in use; the deprecated ones are
  proven empty by `assert_no_plaintext_pii()` (see `compliance-evidence/ssn_backfill_evidence.md`).
- **Processor credentials:** per-tenant Forth credentials are encrypted at rest
  (`company_processor_configs.api_key_encrypted`); `decrypt_processor_credentials` is
  **service-role-only** and never callable by `anon`/`authenticated`.
- **Reveal auditing:** every decrypt is written to `system_audit_log` (`pii.reveal.*`).
- **In transit:** TLS everywhere (Supabase, external APIs, static frontend host).

## 4. Authentication & authorization

- Email/password + Google SSO via Supabase Auth; optional TOTP MFA; password reset; inactivity
  timeout (30 min idle, cross-tab).
- Edge functions reject anonymous callers (`requireAuth`); service-role calls are accepted only
  via a constant-time key comparison (no timing leak).
- Role model via `user_roles` + `has_role`; admin-only tables enforce role in their RLS policies.

## 5. Input validation, CORS, rate limiting

- **Zod** validates every edge-function input/webhook payload — CI-enforced (`check:zod`, 24
  functions).
- **CORS** is restricted to a per-environment allowlist; wildcard origins are CI-forbidden
  (`check:cors`).
- **Rate limiting (Phase D):** a Postgres-backed fixed-window limiter (`check_rate_limit`,
  service-role-only) wired into auth-adjacent and external-API-calling functions
  (`forth-auth`, `dialpad-initiate`, `docuseal-send`, the two `*-test*` endpoints) by user id,
  and into the unauthenticated webhooks by source IP (before HMAC, to blunt signature
  brute-force). Returns HTTP 429 with `Retry-After`. Fails open on limiter-infrastructure error
  (logged), so a limiter outage degrades to "no limit" rather than an outage.

## 6. Audit trail

`system_audit_log` captures sensitive mutations and every PII reveal via `audit_trigger_fn` /
`log_audit_event`, attached to `staff`, `user_roles`, `clients`, `leads`, company-type changes,
and the decrypt helpers. Append-only in practice; reviewed in the RLS audit.

## 7. Secret hygiene

- No secrets in source: `.env` is gitignored, only `.env.example` is tracked, and `check:secrets`
  scans every commit for high-signal patterns. (Full git-history scanning via gitleaks is a
  follow-up; see §9.)
- Per-environment secrets are provisioned via the secret manager (Supabase function secrets /
  environment secrets), documented in `.env.example`.

## 8. SAST / dependency posture

- **CodeQL (SAST)** runs in CI (`security-extended` queries, JS/TS) — Phase D.
- `npm audit` blocks high/critical advisories at merge.
- **Edge-function type-checking** is enforced in CI on the local graph (`deno check
--no-check=remote`) — Q-A8 resolved in Phase D; only the remote esm.sh type graph is skipped.

## 9. Incident-response posture & known limitations

- **Incident response:** on-call runbooks (top-20 failure modes) are a **Phase G** deliverable;
  until then, escalation is ad-hoc to the platform owner. This is a known gap, tracked.
- **Rate-limit fail-open:** intentional (availability over strict enforcement on limiter
  outage); revisit if abuse is observed.
- **Full git-history secret scan (gitleaks) + key rotation runbook:** follow-ups, not yet landed.
- **Compliance sign-off (Q-A5):** evidence is engineering-complete and auto-verified; named
  attestation pending.

## 10. Verification summary

| Control                       | Enforced by                              | Where                          |
| ----------------------------- | ---------------------------------------- | ------------------------------ |
| Tenant isolation              | RLS + helpers                            | `db-verify` (21 groups)        |
| PII encryption + no plaintext | `encrypt_pii`, `assert_no_plaintext_pii` | `db-verify` (G6, G21)          |
| Input validation              | Zod                                      | `check:zod`                    |
| CORS                          | allowlist                                | `check:cors`                   |
| Rate limiting                 | `check_rate_limit`                       | `db-verify` (G20) + edge tests |
| Secrets                       | scan                                     | `check:secrets`                |
| SAST                          | CodeQL                                   | `codeql` job                   |
| Dependencies                  | npm audit                                | `verify` job                   |
| Edge-fn types                 | `deno check --no-check=remote`           | `edge-fn-test` job             |
