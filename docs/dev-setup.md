# Local Development Setup

> **Phase B deliverable.** Get from a fresh clone to a running Cornerstone dev environment —
> app + local Supabase stack + synthetic seed data — in under an hour. If anything here takes
> longer or doesn't work, that's a bug: open an issue so onboarding stays fast.

There are two supported paths to the backend stack. Use whichever fits your machine:

- **Path A — Supabase CLI (recommended).** Native, fastest, what CI uses.
- **Path B — Docker Compose.** For engineers who prefer an all-container workflow or can't
  install the Supabase CLI. See [Docker Compose](#path-b--docker-compose).

Both paths give you the same Postgres schema and the same seed data.

---

## Prerequisites

| Tool         | Version             | Notes                                                                         |
| ------------ | ------------------- | ----------------------------------------------------------------------------- |
| Node.js      | ≥ 20 (see `.nvmrc`) | `nvm use` picks it up. npm ships with Node.                                   |
| Supabase CLI | ≥ 2.x               | Path A only. [Install guide](https://supabase.com/docs/guides/cli).           |
| Docker       | ≥ 24                | Required by the Supabase CLI (it runs the stack in containers) and by Path B. |
| Git          | any recent          |                                                                               |

> **Docker is required either way** — the Supabase CLI starts the local stack as containers.
> If you can't run Docker at all, you can still run the frontend against a remote dev Supabase
> project; ask the team for credentials.

---

## Path A — Supabase CLI (recommended)

### 1. Clone + install

```bash
git clone https://github.com/johng-glg/cornerstone.git
cd cornerstone
nvm use            # or ensure Node ≥ 20
npm install
```

### 2. Environment file

```bash
cp .env.example .env
```

Start the stack (next step) and it prints the local keys; paste the anon key into `.env`.
See [`.env.example`](../.env.example) for what each variable is and where it comes from.

### 3. Start the local Supabase stack

```bash
npx supabase start
```

The first run pulls container images (a few minutes); later runs are fast. When it finishes it
prints a credentials block:

```
         API URL: http://127.0.0.1:54321
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
        anon key: eyJ...        <-- paste into VITE_SUPABASE_PUBLISHABLE_KEY in .env
service_role key: eyJ...        <-- server/edge only; never put in the frontend
```

`supabase start` automatically:

1. applies every migration in `supabase/migrations/`, then
2. loads `supabase/seed.sql` (the synthetic multi-tenant dataset).

So a single command gives you a fully-populated database. To reset to a clean seeded state at
any time:

```bash
npx supabase db reset
```

### 4. Run the app

```bash
npm run dev          # http://localhost:8080
```

Log in with any [seeded user](#seeded-data) — e.g. `admin@northstar.test` / `Cornerstone!1`.

### Local service URLs

| Service                   | URL                                                       |
| ------------------------- | --------------------------------------------------------- |
| App (Vite dev server)     | http://localhost:8080                                     |
| Supabase API              | http://127.0.0.1:54321                                    |
| Postgres                  | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Supabase Studio (DB UI)   | http://127.0.0.1:54323                                    |
| Inbucket (captured email) | http://127.0.0.1:54324                                    |

---

## Seeded data

`supabase/seed.sql` creates a **synthetic, PII-free** multi-tenant dataset. It is **idempotent**
(safe to re-run) and uses obviously-fake names, emails, and SSNs (the `900-00-000x` range, stored
only encrypted — never plaintext).

### Tenants

| Tenant                | Type                | UUID prefix |
| --------------------- | ------------------- | ----------- |
| Northstar Legal Group | `law_firm`          | `0a…`       |
| Beacon Debt Partners  | `affiliate`         | `0b…`       |
| Cornerstone Financing | `financing_company` | `0c…`       |

### Login-ready users

**Every seeded user's password is `Cornerstone!1`** (local only).

| Email                       | Tenant      | Role           |
| --------------------------- | ----------- | -------------- |
| `admin@northstar.test`      | Northstar   | `admin`        |
| `attorney@northstar.test`   | Northstar   | `attorney`     |
| `paralegal@northstar.test`  | Northstar   | `paralegal`    |
| `admin@beacon.test`         | Beacon      | `admin`        |
| `casemanager@beacon.test`   | Beacon      | `case_manager` |
| `admin@cornerstonefin.test` | Cornerstone | `admin`        |

The two tenants Northstar and Beacon also get clients, leads, client-services, a liability, a
PLSA processor config (with an _encrypted_ fake key), integrations, an email template, and a
welcome notification — enough to exercise cross-tenant isolation by logging in as users from
different tenants and confirming you only ever see your own tenant's data.

> The `leads.paralegal_visibility` feature flag is **on** for Northstar and **off** for Beacon,
> so you can see the paralegal lead-visibility gate working without touching config.

---

## Common tasks

| Task                           | Command                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| Reset DB to clean seeded state | `npx supabase db reset`                                                                      |
| Stop the stack                 | `npx supabase stop`                                                                          |
| Regenerate TypeScript DB types | `npx supabase gen types typescript --local > src/integrations/supabase/types.ts`             |
| Run unit/integration tests     | `npm run test`                                                                               |
| Run all CI gates locally       | `npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build` |
| Run the edge-function tests    | `deno test --no-check --allow-net --allow-env --allow-read supabase/functions`               |

---

## Troubleshooting

**`supabase start` fails pulling images / `toomanyrequests`.** Docker Hub / ECR anonymous-pull
rate limit. Wait a few minutes and retry, or `docker login`. CI works around this by starting
only the DB service.

**Port already in use (54321–54324, 8080).** Another stack or app is running. `npx supabase stop`
to free the Supabase ports; change `server.port` in `vite.config.ts` if 8080 clashes.

**Login fails for a seeded user.** Make sure you reset after pulling new migrations
(`npx supabase db reset`) and that you're using `Cornerstone!1`. Captured emails (password
reset, etc.) show up in Inbucket at http://127.0.0.1:54324.

**Schema looks stale.** `npx supabase db reset` re-applies all migrations + reseeds. If types
are out of date, regenerate them (see table above).

**Docker not available.** Use a remote dev Supabase project instead — set `VITE_SUPABASE_URL` /
`VITE_SUPABASE_PUBLISHABLE_KEY` in `.env` to the remote project and run `npm run dev`. You won't
have local edge functions or seed control, but the frontend will run.

---

## Path B — Docker Compose

For an all-container workflow, `docker-compose.yml` brings up Postgres with all migrations and
the seed applied — no Supabase CLI required.

```bash
docker compose up -d          # starts Postgres on :54322, applies migrations + seed
docker compose logs -f db     # watch migration/seed progress
```

This path gives you the **database** (schema + seed) only — it's aimed at engineers who want to
run the app and DB tests without the full Supabase service mesh. Point `.env` at it:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321   # if you also run `supabase start` for Auth/API
# For DB-only work, connect tools directly to postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

To tear down (and wipe the volume for a clean reseed):

```bash
docker compose down -v
```

> For the full local experience (Auth, Storage, Edge Functions, Studio, Inbucket), Path A is
> still recommended — the Supabase CLI orchestrates all of those services. Path B is the
> lightweight DB-centric option.

See [`contributor-guide.md`](./contributor-guide.md) for workflow, branch, and PR conventions.
