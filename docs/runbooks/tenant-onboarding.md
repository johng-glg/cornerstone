# Runbook — Tenant Onboarding

> **Phase E exit criterion.** End-to-end provisioning of a new tenant in **under 15 minutes**.
> This runbook is the documented path; the provisioning itself is a single platform-admin action.
>
> **Audience:** platform admins (cross-tenant operators). **Not** self-service for tenant users.

---

## Prerequisites

- You are a **platform admin** — your `auth.users` id is in `public.platform_admins`. (Tenant
  `admin` role is _not_ sufficient; provisioning is cross-tenant.)
- You know the new tenant's: name, type (`law_firm` / `affiliate` / `financing_company`),
  desired subdomain (optional), and the first admin's name + email.

To grant platform-admin (one-time, service role / SQL console):

```sql
INSERT INTO public.platform_admins (user_id, note)
VALUES ('<auth-user-uuid>', 'ops: <who/why>');
```

---

## Provision a tenant (the 15-minute path)

### Option A — via the app (recommended)

1. Sign in as a platform admin.
2. Admin → **Tenants → New tenant**.
3. Fill in name, type, subdomain (optional), and the first admin's name + email.
4. Submit. Under the hood this calls the `provision-tenant` edge function, which:
   - creates the admin's `auth.users` record (email pre-confirmed),
   - calls `public.provision_tenant(...)` to create the company + first `staff` row + `admin`
     role **atomically**,
   - writes a `tenant.provisioned` audit event.
5. The new admin receives access by completing the **password reset** flow (Forgot password →
   email link). No password is set at creation, so none is ever transmitted.

### Option B — via the edge function directly

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/provision-tenant" \
  -H "Authorization: Bearer $PLATFORM_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Northstar Legal Group",
    "company_type": "law_firm",
    "subdomain": "northstar",
    "admin_email": "admin@northstar.example",
    "admin_first_name": "Nadia",
    "admin_last_name": "Admin"
  }'
# → { "success": true, "company_id": "...", "admin_user_id": "...", "message": "..." }
```

### Verify (under a minute)

```sql
-- tenant exists, is active, subdomain set
SELECT id, name, company_type, subdomain, is_active FROM public.companies WHERE subdomain = 'northstar';
-- first admin wired up
SELECT s.first_name, s.last_name, ur.role
  FROM public.staff s JOIN public.user_roles ur ON ur.user_id = s.user_id
 WHERE s.company_id = (SELECT id FROM public.companies WHERE subdomain = 'northstar');
-- usage row is live
SELECT * FROM public.tenant_usage_metrics WHERE subdomain = 'northstar';
```

The admin then logs in (password-reset flow) and sees only their tenant — RLS enforces isolation
(verified by `tests/db/rls_isolation.test.sql`, 22 groups).

---

## Subdomain routing

- `companies.subdomain` is a DNS label (lowercase alphanumeric + hyphen, ≤63 chars), unique
  case-insensitively, nullable (NULL = shared host).
- The frontend/router maps host → tenant via `public.resolve_tenant_by_subdomain('<label>')`.
- DNS / CDN host mapping for the chosen hyperscaler is wired in **Phase F** (Q-A6b); the data
  layer is ready now.

---

## Feature flags (per tenant)

- Every flag is registered in `public.feature_flag_catalog` (key, label, description, default).
  The admin UI lists the catalog, so there are **no engineer-only flags**.
- A tenant's effective value = its override in `tenant_feature_flags` if present, else the
  catalog default: `SELECT public.effective_feature_flag('<company_id>', '<flag_key>');`
- Toggle an override (tenant admin or platform admin) — UI, or:
  ```sql
  INSERT INTO public.tenant_feature_flags (company_id, flag_key, enabled)
  VALUES ('<company_id>', '<flag_key>', true)
  ON CONFLICT (company_id, flag_key) DO UPDATE SET enabled = excluded.enabled;
  ```

---

## Data export (GDPR / CCPA / consumer request)

Platform admin, or the tenant's own admin:

```sql
SELECT public.export_tenant_data('<company_id>');  -- returns a JSON snapshot; writes tenant.exported audit
```

The export includes company, staff, clients, leads, client*services, transactions, and feature
flags. **PII columns remain ciphertext** in the export — decrypt separately via the audited
`decrypt*\*` helpers only if the request requires cleartext.

---

## Tenant deletion (irreversible)

Platform admin only, and intentionally guarded so it cannot be a single accidental call:

1. **Deactivate first:**
   ```sql
   UPDATE public.companies SET is_active = false WHERE id = '<company_id>';
   ```
2. **Delete with a name confirmation** (must match exactly):

   ```sql
   SELECT public.delete_tenant_data('<company_id>', '<exact company name>');
   ```

   - Fails if the caller isn't a platform admin, if the tenant is still active, or if the name
     doesn't match.
   - Cascades clear child rows (most `company_id` FKs are `ON DELETE CASCADE`).
   - Writes a `tenant.deleted` audit event **before** the delete.

> Consider running `export_tenant_data` and retaining the snapshot before deletion, if retention
> policy requires it.

---

## Rollback / failure modes

| Symptom                                        | Cause / action                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `provision-tenant` returns 403                 | Caller isn't a platform admin. Add them to `platform_admins`.                                                          |
| 409 "already registered"                       | The admin email already has an auth user. Use a different email or reuse the existing user via SQL `provision_tenant`. |
| Provision fails after auth user created        | The edge function deletes the orphaned auth user automatically; fix the payload and retry.                             |
| `delete_tenant_data` raises "deactivate first" | Set `is_active = false`, then retry.                                                                                   |
| Subdomain rejected                             | Must be a valid DNS label and unique (case-insensitive).                                                               |

---

## What's automated vs. manual

- **Automated:** company + first admin + role creation, audit logging, usage metrics, flag
  defaults, export, guarded deletion.
- **Manual / later phase:** DNS + CDN host mapping for subdomains (Phase F), and any
  tenant-specific data import.
