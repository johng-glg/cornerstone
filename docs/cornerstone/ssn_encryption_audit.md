# SSN Encryption Audit — Operation Cornerstone Phase 1A

**Generated:** 2026-05-28
**Decision:** **Deferred — log as future build per user direction.**

## Current state

- `public.clients.ssn_encrypted` exists as `text NOT NULL = false`.
- `public.clients.ssn_last4_encrypted` (referenced in the spec) **does not exist**.
- Sample audit across all 13 client rows:
  - 1 row populated, 12 rows null.
  - The 1 populated value matches **neither** a plaintext SSN pattern (`\d{3}-?\d{2}-?\d{4}`) **nor** a `pgp_sym_encrypt` ciphertext length (>50 chars).
  - Conclusion: the existing populated value is likely placeholder/test data, not real encrypted PII. The column is **misleadingly named** — it carries no demonstrable encryption.

## Risk classification

- **Today:** Low real-world exposure (only 1 row, value not a real SSN).
- **At commercial launch:** **Critical** — this column will hold live consumer SSNs and is currently unencrypted at the application layer. Database-at-rest encryption from Supabase is insufficient for bar defensibility because anyone with `SELECT` on `clients` reads the value as plaintext.

## Recommended future build

When the project is ready to handle production SSNs (before first commercial tenant or first ingest of real client SSNs, whichever comes first):

1. Add Supabase secret `SSN_ENCRYPTION_KEY` (rotation: annual, see `api_key_rotation_policy.md`).
2. Create migration enabling `pgcrypto` (already installed in `public`; warn 0014).
3. Add `ssn_ciphertext bytea` and `ssn_last4 text` columns alongside the existing `ssn_encrypted` column.
4. Backfill: `UPDATE clients SET ssn_ciphertext = pgcrypto.pgp_sym_encrypt(ssn_encrypted, <key>), ssn_last4 = right(ssn_encrypted, 4) WHERE ssn_encrypted IS NOT NULL AND ssn_encrypted ~ '^\d{3}-?\d{2}-?\d{4}$';`
5. Provide SECURITY DEFINER read function `decrypt_client_ssn(_client_id uuid)` callable only by `has_role(auth.uid(), 'admin')` or the limited set of roles that legally need to view full SSN.
6. After successful backfill, drop the plaintext `ssn_encrypted` column.

## What is NOT being done in Phase 1A

- No encryption build.
- No backfill.
- No column rename.

This is logged in `mem://security/deferred-cornerstone-items` so future agents do not silently skip it.
