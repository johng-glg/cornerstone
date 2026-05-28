# Phase 1 Summary — Operation Cornerstone

**Window:** Phase 1A (Security Hardening) + Phase 1B (Audit Log Foundation)
**Status:** ✅ Complete

## What shipped

### 1A — Security hardening

| Item | Status | Artifact |
|---|---|---|
| HIBP leaked-password protection | ✅ Enabled | `configure_auth(password_hibp_enabled: true)` |
| Password reset flow | ✅ Built | `/forgot-password`, `/reset-password` pages + `reset-staff-password` edge function |
| Admin password reset (for staff) | ✅ Built | `reset-staff-password` edge function (admin-gated, returns secure temp password) |
| MFA opt-in (TOTP) | ✅ Built | `MfaCard` in Settings → Profile; uses `supabase.auth.mfa.enroll/challenge/verify` |
| API key rotation policy | ✅ Documented | `docs/cornerstone/api_key_rotation_policy.md` |
| RLS audit + remediation | ✅ Complete | `docs/cornerstone/rls_audit_report.md` — 52 → 22 warnings, all remaining accepted |
| Input validation audit | ✅ Complete | `docs/cornerstone/input_validation_audit.md` — no critical findings |
| SSN encryption audit | ✅ Logged as future build | `docs/cornerstone/ssn_encryption_audit.md` |
| Rate limiting | 📋 Deferred (logged) | Tracked in Phase 2+ scope |
| Inactivity session timeout | 📋 Deferred (logged) | Tracked in Phase 2+ scope |

### 1B — Audit log foundation

| Item | Status | Artifact |
|---|---|---|
| `system_audit_log` table (append-only) | ✅ Created | 12 cols, RLS company-scoped, admin override |
| `log_audit_event(...)` helper | ✅ Created | `SECURITY DEFINER`, `search_path = public` |
| Indexes for query patterns | ✅ Created | actor/time, entity, company/time, action/time |

## Database remediation (this phase)

- Pinned `search_path` on `check_trigger_match(jsonb, jsonb)`.
- Tightened write policies on `appearance_requests`, `filing_fees`, `creditor_contacts`, `notes`, `note_mentions` (no more `USING (true)`).
- Revoked anon `EXECUTE` on 17 `SECURITY DEFINER` functions; explicit grants to `authenticated`/`service_role`.

## Linter delta

```
Before Phase 1: 0 errors, 52 warnings
After  Phase 1: 0 errors, 22 warnings  (all accepted, all documented)
```

Remaining warning categories: extension in public (1), permissive INSERT on `notifications`/`forth_sync_log` (2 — intentional system writes), public bucket listing (2 — staff-only via signed URLs), SECDEF callable by authenticated (17 — required for RLS).

## Risks / open items carried to Phase 2

1. **SSN encryption** — column exists but is plaintext-capable; encrypt before first commercial tenant ingests real SSNs.
2. **Rate limiting** — Lead intake form has no throttle; add CAPTCHA + edge rate-limit before public exposure.
3. **Inactivity timeout** — no client-side idle logout; revisit when MFA is mandatory.
4. **Mime/size validation on storage uploads** — accepted while internal-only; add server-side sniffing before multi-tenant launch.
5. **Branded auth emails** — currently uses Lovable defaults; requires custom email domain setup.

## Phase 1 sign-off

- All in-scope deliverables shipped.
- All deferred items explicitly logged with future-build instructions.
- Audit log table ready to be wired into Phase 2 write paths.

**Ready to begin Phase 2.**
