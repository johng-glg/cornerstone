# Runbook — Bring-up checklist (GLG staging)

One ordered, tick-box page for getting Cornerstone fully live: seed data, GitHub secrets/variables,
deploy workflows, and the vendor integrations. Branch: `claude/vibrant-bardeen-nwrt8`.

Legend: ☐ = to do · ✅ = already done (this session).

---

## 1. Seed / demo data (Supabase SQL editor)

- ✅ Base seed (`seed.sql` / `seed.txt`) — tenant + staff. (Already run.)
- ☐ **Re-run the corrected demo seed** (`seed_demo.sql` / `seed_demo.txt`). The earlier version
  referenced staff by `user_id` where `staff.id` was required (FK 23503); fixed to resolve
  `staff.id` from `user_id`. Idempotent — safe to re-run.

> Order if ever starting fresh: migrations (`supabase/migrations/*` in filename order) → base seed → demo seed.

---

## 2. GitHub secrets & variables

GitHub → repo **Settings → Secrets and variables → Actions**. **Mind the tab**: `vars.*` reads the
**Variables** tab, `secrets.*` reads the **Secrets** tab. Putting a value in the wrong tab is why the
edge-function deploy runs **skipped** (the `if: vars.SUPABASE_PROJECT_REF != ''` gate saw it empty).

| Status | Name                                          | Tab           | Value                                                                |
| ------ | --------------------------------------------- | ------------- | -------------------------------------------------------------------- |
| ✅     | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Secrets       | IAM `cornerstone-deployer`                                           |
| ✅     | `CLOUDFRONT_DISTRIBUTION_ID`                  | Variables     | the `E…` id                                                          |
| ☐      | **`SUPABASE_PROJECT_REF`**                    | **Variables** | `ppefwolueksddgabvseh` ← add this; the deploys skip without it       |
| ☐      | **`SUPABASE_ACCESS_TOKEN`**                   | **Secrets**   | token from supabase.com/dashboard/account/tokens                     |
| ☐      | `SUPABASE_DB_PASSWORD`                        | Secrets       | DB password from project creation (only for the DB-migrate workflow) |

---

## 3. Supabase function secrets (for the integrations)

Supabase → **Project Settings → Edge Functions → Secrets**. `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` are auto-injected — only set the vendor ones.

| Status | Name                               | Used by                    | Notes                                                                            |
| ------ | ---------------------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| ✅     | `DOCUSEAL_API_TOKEN`               | docuseal-send              | added                                                                            |
| ✅     | `DOCUSEAL_WEBHOOK_SECRET`          | docuseal-webhook           | added (HMAC signing secret)                                                      |
| ✅     | `DIALPAD_API_TOKEN`                | dialpad-\*                 | added                                                                            |
| ☐      | **`DIALPAD_WEBHOOK_SECRET`**       | dialpad-webhook + register | **generate any secure random string**; the register fn signs the webhook with it |
| ☐      | **`CORS_ALLOWED_ORIGINS`**         | all (shared CORS)          | `https://d3tqg4hn7ijk94.cloudfront.net`                                          |
| ☐      | `FORTH_CLIENT_ID`, `FORTH_API_KEY` | forth-\*                   | only if enabling Forth                                                           |

> PLSA uses the mock adapter — no external secret needed.

---

## 4. Deploy the edge functions

- ☐ After section 2 is set: GitHub → **Actions → "Deploy — edge functions" → Run workflow**
  (branch `claude/vibrant-bardeen-nwrt8`).
- ☐ Confirm the **"Deploy edge functions"** job **runs** (green) — not `skipped`. If it skips again,
  `SUPABASE_PROJECT_REF` is missing/misspelled or in the wrong tab.

(DB migrations are separate: they apply via the SQL editor, or via **Actions → "Deploy — database"** once
`SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` are set.)

---

## 5. Dialpad webhook (API-only — no dashboard)

Dialpad webhooks must be created via the API. After section 3 + 4:

- ☐ Invoke `dialpad-register-webhook` once (creates the webhook + call-event subscription,
  server-side, using the secrets above):
  ```
  curl -X POST https://ppefwolueksddgabvseh.supabase.co/functions/v1/dialpad-register-webhook \
    -H "Authorization: Bearer <your logged-in Supabase access token>" \
    -H "Content-Type: application/json" -d '{}'
  ```
  Expect `{ success: true, webhook_id, subscription_id }`.
  _(Optional: a one-tap "Register webhook" button can be added to the Integrations page instead.)_

---

## 6. Paste webhook URLs into the vendor dashboards

- ☐ DocuSeal → webhook URL `https://ppefwolueksddgabvseh.supabase.co/functions/v1/docuseal-webhook`
  (signed with `DOCUSEAL_WEBHOOK_SECRET`).
- ☐ Dialpad → handled by the register call in section 5 (URL points at `…/dialpad-webhook`).

---

## 7. Verify in-app

- ☐ App → **Integrations** → toggle each provider on → **Test** (calls `*-test-connection`).
- ☐ Confirm the provider stamps **connected**; Forth/Dialpad/DocuSeal surfaces then populate as data syncs.

---

### Quick "what's left right now" summary

1. Re-run the fixed **demo seed**.
2. Add GitHub **Variable** `SUPABASE_PROJECT_REF` + **Secret** `SUPABASE_ACCESS_TOKEN` (and `SUPABASE_DB_PASSWORD` if using the DB workflow).
3. Add Supabase secrets **`DIALPAD_WEBHOOK_SECRET`** + **`CORS_ALLOWED_ORIGINS`** (and Forth keys if used).
4. Run the **Deploy — edge functions** workflow; confirm it's not skipped.
5. Invoke **`dialpad-register-webhook`** once.
6. Paste the **DocuSeal** webhook URL into DocuSeal.
7. **Test** each integration in-app.
