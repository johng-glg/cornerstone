# Phase 2A Summary — PII Encryption Foundation

**Window:** Operation Cornerstone, Phase 2 chunk A
**Status:** ✅ Complete (foundation shipped; backfill of real SSNs/banking is N/A — none exist yet)

## What shipped

### Vault key
- Random 32-byte key generated and stored in `vault.secrets` under name `pii_encryption_key`.
- Key never appears in source, env files, or logs. Accessed only by SECURITY DEFINER functions.

### New columns
| Table | Column | Type | Purpose |
|---|---|---|---|
| `public.clients` | `ssn_last4` | text | Plain last-4 for UI display |
| `public.clients` | `ssn_ciphertext` | bytea | Full SSN encrypted via `encrypt_pii()` (future) |
| `public.lead_banking` | `account_number_ciphertext` | bytea | Full account # encrypted |
| `public.lead_banking` | `routing_number_ciphertext` | bytea | Full routing # encrypted |
| `public.lead_banking` | `account_number_last4` | text | Plain last-4 for UI display |
| `public.lead_banking` | `routing_number_last4` | text | Plain last-4 for UI display |

### Deprecated columns (kept for back-compat, commented; no longer written)
- `clients.ssn_encrypted` — was misnamed; only ever held last4 placeholders
- `lead_banking.account_number_encrypted` (text) — was unused
- `lead_banking.routing_number_encrypted` (text) — was unused

### Helper functions (all `SECURITY DEFINER`, `search_path` pinned)
| Function | Caller | Behavior |
|---|---|---|
| `public.encrypt_pii(text) → bytea` | authenticated, service_role | Loads vault key, returns `pgp_sym_encrypt(plaintext, key)`. Returns NULL for null/empty input. |
| `public.decrypt_client_ssn(uuid) → text` | authenticated (admin-gated inside) | Raises unless `has_role(auth.uid(),'admin')` AND `can_access_company` for the client. |
| `public.decrypt_lead_banking(uuid) → jsonb` | authenticated (admin-gated inside) | Same gating; returns `{account_number, routing_number}`. |

Anon `EXECUTE` revoked on all three.

### App write-path changes
- `src/components/enrollment/EnrollmentWizard.tsx` now writes `ssn_last4` instead of the deprecated `ssn_encrypted` column. No UI behavior change — wizard only ever collected last-4.

### Backfill
- Sole non-null `clients.ssn_encrypted` value (`"5566"`) was copied into `ssn_last4`. No ciphertext rows to migrate.
- `lead_banking` had zero rows; nothing to backfill.

## Verification

- Migration applied, linter delta = +3 accepted SECDEF warnings (same category as the 17 already accepted in Phase 1A `rls_audit_report.md`). No new errors.
- `clients.ssn_encrypted` row preserved; new `clients.ssn_last4 = '5566'` confirmed.
- Anon role cannot execute `encrypt_pii` / `decrypt_*` (REVOKE issued).
- Decrypt functions raise for non-admins and for cross-company access.

## Out of scope (intentional)

- Dropping deprecated `*_encrypted` columns — defer until Phase 2A-2 once any external integrations are confirmed off them.
- Full-SSN capture in UI — wizard still collects only last-4. When full-SSN intake is added, write path will `rpc('encrypt_pii', { _plaintext })` and store result in `ssn_ciphertext`.
- Persisting full banking in `lead_banking` from `EnrollmentWizard` — currently banking is only forwarded to Forth Pay, not stored locally. When local storage is needed, use `encrypt_pii` RPC and set `account_number_last4` / `routing_number_last4` for display.
- Admin SSN reveal UI — not yet wired; `decrypt_client_ssn(uuid)` is callable via `supabase.rpc()` when needed.
- Key rotation runbook — covered in `docs/cornerstone/api_key_rotation_policy.md`; vault key rotation procedure to be added in 2A-2.

## Risks / open items

1. Deprecated columns still readable by RLS — fine for now (no real PII), but drop in 2A-2.
2. No audit log entry on decrypt calls yet — wire to `log_audit_event()` in Phase 2B (audit-log wiring).
3. Vault key has no rotation cron — manual rotation only.

## Phase 2A sign-off

Foundation is in place. All future PII writes flow through `encrypt_pii()`; all reveal flows go through admin-only `decrypt_*` SECDEF functions; no plaintext SSN or banking ciphertext can be read without going through a checked code path.

**Ready to begin Phase 2B (audit log wiring) — which will also instrument decrypt calls.**
