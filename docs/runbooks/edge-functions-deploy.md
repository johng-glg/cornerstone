# Runbook — Deploying the edge functions (integrations go live)

The 25 edge functions (Forth, Dialpad, DocuSeal, PLSA, tenant provisioning) are written and
tested but **not deployed** to the cloud project. Deploying them + setting vendor secrets is what
makes the Integrations screens show real data. This is the one remaining step gated on you
(it needs a Supabase access token and third-party API keys).

## One-time: enable CI deploys

In GitHub → repo **Settings → Secrets and variables → Actions**:

| Kind     | Name                    | Value                                                      |
| -------- | ----------------------- | ---------------------------------------------------------- |
| Variable | `SUPABASE_PROJECT_REF`  | `ppefwolueksddgabvseh`                                     |
| Secret   | `SUPABASE_ACCESS_TOKEN` | A token from https://supabase.com/dashboard/account/tokens |

Once both exist, the **Deploy — edge functions** workflow runs on any push that touches
`supabase/functions/**` (or via **Actions → Run workflow**). It deploys all functions; per-function
auth config (e.g. webhooks with `verify_jwt = false`) comes from `supabase/config.toml`.

## Function secrets (vendor API keys)

Edge functions read these via `Deno.env.get`. Supabase auto-injects `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` — you only set the vendor ones below.

Set them in the dashboard (**Project Settings → Edge Functions → Secrets**) or via CLI:

```bash
supabase secrets set --project-ref ppefwolueksddgabvseh \
  FORTH_CLIENT_ID=... \
  FORTH_API_KEY=... \
  DIALPAD_API_TOKEN=... \
  DIALPAD_WEBHOOK_SECRET=... \
  DOCUSEAL_API_TOKEN=... \
  DOCUSEAL_WEBHOOK_SECRET=... \
  CORS_ALLOWED_ORIGINS=https://d3tqg4hn7ijk94.cloudfront.net
```

| Secret                             | Used by                 | Where to get it                     |
| ---------------------------------- | ----------------------- | ----------------------------------- |
| `FORTH_CLIENT_ID`, `FORTH_API_KEY` | all `forth-*` functions | Forth CRM API credentials           |
| `DIALPAD_API_TOKEN`                | `dialpad-initiate`      | Dialpad admin → API                 |
| `DIALPAD_WEBHOOK_SECRET`           | `dialpad-webhook`       | Dialpad webhook config              |
| `DOCUSEAL_API_TOKEN`               | `docuseal-send`         | DocuSeal account → API              |
| `DOCUSEAL_WEBHOOK_SECRET`          | `docuseal-webhook`      | DocuSeal webhook config             |
| `CORS_ALLOWED_ORIGINS`             | all (shared CORS)       | the site origin(s), comma-separated |

PLSA functions (`plsa-*`) use the mock adapter by default — no external secret required.

## Webhook URLs (register with the vendors after deploy)

- Dialpad → `https://ppefwolueksddgabvseh.supabase.co/functions/v1/dialpad-webhook`
- DocuSeal → `https://ppefwolueksddgabvseh.supabase.co/functions/v1/docuseal-webhook`

## Verify

After deploy + secrets, in the app: **Integrations** → toggle a provider on → **Test** (calls the
provider's `*-test-connection` function). A green toast = credentials work and the integration row
is stamped connected. The Forth/Dialpad/DocuSeal tabs across the app then populate as data syncs.

## Rollback

`supabase functions delete <name> --project-ref ppefwolueksddgabvseh`, or redeploy a prior commit.
