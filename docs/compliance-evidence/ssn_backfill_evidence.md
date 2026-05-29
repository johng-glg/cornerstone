# SSN / PII Backfill Evidence

> **Phase D compliance evidence.** Resolves the Lovable "accepted risk" that PII may have been
> stored in plaintext-era columns. Demonstrates that current PII is encrypted-only and that the
> deprecated plaintext columns hold no data.
>
> **Date:** 2026-05-29 · **Status:** Verified by automated assertion in CI. Production-data
> attestation pending the first production migration run (see §4).

---

## 1. The accepted risk

The Lovable build evolved PII storage over time. Early columns
(`clients.ssn_encrypted`, `lead_banking.account_number_encrypted`,
`lead_banking.routing_number_encrypted` — all `text`) predate the Phase-2A move to vault-keyed
binary encryption. `clients.ssn_encrypted` is explicitly commented **DEPRECATED Phase 2A** in the
schema. The risk: residual plaintext (or weakly-encoded) PII in those columns.

## 2. Current (correct) storage

PII is stored only in binary ciphertext columns, written through `encrypt_pii()`:

| Data              | Column (current)                                                          | Written via     |
| ----------------- | ------------------------------------------------------------------------- | --------------- |
| SSN               | `clients.ssn_ciphertext` (bytea) + `clients.ssn_last4` (text, non-secret) | `encrypt_pii()` |
| Bank account #    | `lead_banking.account_number_ciphertext` (bytea)                          | `encrypt_pii()` |
| Bank routing #    | `lead_banking.routing_number_ciphertext` (bytea)                          | `encrypt_pii()` |
| Processor API key | `company_processor_configs.api_key_encrypted`                             | `encrypt_pii()` |

`encrypt_pii` = `extensions.pgp_sym_encrypt` keyed by the Supabase Vault secret
`pii_encryption_key`, with a pinned `search_path`. Reveals are audit-logged; credential
decryption is service-role-only.

## 3. The verification

Phase D adds a standing check that the deprecated columns hold nothing:

- **View** `public.pii_plaintext_audit` — counts non-null values in each deprecated column.
- **Function** `public.assert_no_plaintext_pii()` — raises if any count is > 0
  (service-role-only).

These run as **test group 21** of `tests/db/rls_isolation.test.sql` in the CI `db-verify` job:
the assertion passes on a clean database, and the test then deliberately populates a deprecated
column to prove the assertion _raises_, then restores it. So both the positive and negative
behavior are exercised on every PR.

```sql
-- Manual check against any environment (service role):
SELECT * FROM public.pii_plaintext_audit;          -- every populated_rows must be 0
SELECT public.assert_no_plaintext_pii();            -- returns void; raises if any plaintext
```

## 4. Production attestation (open)

The verification proves the **schema-level** guarantee and holds on the synthetic/seed and CI
databases (zero plaintext). The remaining step is to run `SELECT * FROM public.pii_plaintext_audit;`
against the **production** database after the first production migration/backfill and attach the
(all-zero) output here, counter-signed per Q-A5. Until production exists (Phase F), this is the
standing automated guarantee.

## 5. If the assertion ever fails

1. Identify the offending column/rows via `pii_plaintext_audit`.
2. Re-encrypt into the corresponding `*_ciphertext` column via `encrypt_pii()`, then null the
   deprecated column, in a forward-only migration with inline rollback.
3. Re-run the assertion; attach the clean output.
