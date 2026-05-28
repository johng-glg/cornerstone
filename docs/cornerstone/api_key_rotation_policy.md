# API Key Rotation Policy — Operation Cornerstone Phase 1A

**Generated:** 2026-05-28

## Scope

All third-party credentials stored as Supabase secrets in the project. Verified inventory as of this date:

| Secret | Provider | Usage | Rotation cadence | Rotation owner |
|--------|----------|-------|------------------|----------------|
| `FORTH_CLIENT_ID` | Forth Pay | OAuth client ID for all `forth-*` edge functions | **180 days** (or on staff offboarding with access) | Operations Lead |
| `FORTH_API_KEY` | Forth Pay | OAuth client secret | **180 days**, immediate on suspected compromise | Operations Lead |
| `DOCUSEAL_API_KEY` | DocuSeal | Template send + executed-PDF retrieval | **365 days** | Operations Lead |
| `DOCUSEAL_API_URL` | DocuSeal | Tenant base URL (not secret, but stored as secret for consistency) | Change-driven only | Operations Lead |
| `LOVABLE_API_KEY` | Lovable AI Gateway | All Lovable AI model calls | **Use `lovable_api_key--rotate_lovable_api_key`**; cadence on compromise only | Platform |
| `SUPABASE_*` (URL, anon, service role, JWKS, publishable, secret) | Supabase | Platform — managed; do not rotate manually | Managed by Supabase | Platform |

## Rotation procedure (per secret)

1. **Generate new credential** in the provider's dashboard (Forth Pay portal, DocuSeal admin, etc.) and copy the value.
2. **Update the secret in Lovable Cloud** via `update_secret`. This propagates to all edge functions within ~60 seconds; no redeploy required.
3. **Verify** by triggering a known-good edge function (e.g. `forth-auth` to mint a fresh token).
4. **Log** the rotation as an `api_key_rotated` event in `system_audit_log` (use the `log_audit_event` helper from Phase 1B).
5. **Revoke** the old credential in the provider's dashboard.
6. **Record** the rotation date in the operations runbook.

## Emergency rotation triggers

- Suspected staff-account compromise with access to Lovable Cloud
- Suspected provider-side breach (provider security advisory)
- Departure of any staff member with write access to Lovable Cloud secrets
- Accidental exposure (e.g. secret pasted into a screenshot, slack message, or pushed to a public repo)

In any of those cases, rotate within **24 hours** rather than waiting for the scheduled cadence.

## Cadence enforcement

This is currently a documented policy only. There is no automated reminder system. A future enhancement could:
- Add a `secret_rotations` table tracking last-rotated date per secret.
- Add a weekly cron edge function that fires a notification to admins when a secret is within 30 days of its rotation due date.

Logged as a follow-up item — not built in Phase 1A.
