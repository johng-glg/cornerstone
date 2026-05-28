# Phase 11 — Integrations Management Hub

Shipped: 2026-05-28

Phase 11 introduces a tenant-aware integrations meta-surface so every third-party connector (DocuSeal, Forth Pay, Forth CRM, and later Dialpad) is registered, configured per company, observable through a unified event log, and toggleable from an admin UI.

## Database

### `public.integration_providers` (registry)
Columns: `provider_key` (unique), `display_name`, `category`, `description`, `docs_url`, `icon_key`, `is_active`, `default_event_subscriptions text[]`, `auth_method`, timestamps.
- Seeded: `docuseal`, `forth_pay`, `forth_crm` (Dialpad added in Phase 12).
- GRANT: `SELECT` to `authenticated`; admin-only mutate via RLS.

### `public.company_integrations` (per-tenant config)
Columns: `company_id`, `provider_key` (FK), `is_enabled`, `credentials_vault_ref`, `config jsonb`, `last_connected_at`, `last_connection_error`, `created_by`, `updated_by`, timestamps. UNIQUE `(company_id, provider_key)`.
- RLS: SELECT via `can_access_company`; INSERT / UPDATE / DELETE require `has_role(_, 'admin')`.
- Credentials never stored plaintext — only the Vault secret name.

### `public.integration_event_log` (universal log)
Columns: `company_id`, `provider_key`, `event_type`, `direction`, `entity_type`, `entity_id`, `payload jsonb`, `success`, `error_message`, `latency_ms`, `created_at`.
- Indexes: `(company_id, created_at DESC)`, `(provider_key, created_at DESC)`.
- RLS: admin SELECT scoped by company; INSERT via service_role only.
- Existing `forth_sync_log` and `plsa_sync_log` continue unchanged.

## Shared helpers — `supabase/functions/_shared/integrations.ts`
- `getIntegrationConfig(companyId, providerKey)` — row + decrypted credentials via Vault.
- `logIntegrationEvent(...)` — service-role insert into `integration_event_log`.
- `requireIntegrationEnabled(companyId, providerKey)` — throws when disabled.

New `_shared/markIntegrationConnected.ts`:
- `resolveCompanyId(authHeader)` — pulls the caller's `staff.company_id`.
- `markIntegration(providerKeys[], companyId, { success, error })` — stamps `last_connected_at` or `last_connection_error` on every matching row (used for shared-credential providers, e.g. both `forth_pay` and `forth_crm`).

Existing DocuSeal/Forth edge functions refactored to call `logIntegrationEvent` and short-circuit when `requireIntegrationEnabled` fails.

## Admin UI
- New admin sidebar nav item **Integrations** at `/integrations` (promoted out of the Settings tabs).
- Grid of provider cards: name + icon, category badge, enabled toggle, status pill (Connected / Not configured / Error / Disabled), "Last connected X ago" timestamp.
- Actions per card:
  - **Configure** — side sheet with provider-specific form; credentials displayed as last-4 after save.
  - **Test Connection** — invokes `docuseal-test`, `forth-test-connection`, or `dialpad-test-connection`. On success/failure the helper stamps `last_connected_at` / `last_connection_error`; the UI invalidates the `company-integrations` query so the pill refreshes immediately.
  - **View Activity** — slide-out with the last 50 rows from `integration_event_log` filtered to the provider.

## Test-connection edge functions
- `docuseal-test` — pings DocuSeal API; stamps `docuseal`.
- `forth-test-connection` — forces fresh OAuth via `forth-auth` (clears ~9 day token cache), stamps **both** `forth_pay` and `forth_crm`. No new credentials required — both providers share `FORTH_CLIENT_ID` / `FORTH_API_KEY`.

## Seed
- For every existing company that already had DocuSeal/Forth secrets configured, a `company_integrations` row was inserted with `is_enabled = true` and the Vault refs. Existing functions kept working immediately — no downtime.

## Acceptance
- GLG sees DocuSeal / Forth Pay / Forth CRM as Enabled + Connected.
- Disabling a provider short-circuits the corresponding edge functions via `requireIntegrationEnabled`.
- Test Connection updates the "Last connected" pill in real time.
- `integration_event_log` captures DocuSeal + Forth activity in addition to legacy logs.

## Rollback (forward-only migrations — inline SQL)
```sql
DROP TABLE IF EXISTS public.integration_event_log;
DROP TABLE IF EXISTS public.company_integrations;
DROP TABLE IF EXISTS public.integration_providers;
```
Edge function refactors are additive (logging only) and safe to leave in place even if tables are dropped.
