# Backlog — known gaps & future builds

Living list of work identified but not completed, so nothing gets lost. Newest context at top.
Captured 2026-06-02 after the feature-parity gap-closing pass (PR #34).

## ⚠️ No execution engine behind the rule builders

Both rule systems have authoring UIs but **no runtime that consumes them** (verified: no
consumer in `supabase/functions` or `src`).

- **Workflow rules** (`workflow_rules`) — the When/If/Then/Settings editor saves triggers,
  conditions, actions, and from/to status transitions, but nothing fires them when events occur.
  Needs an execution engine (DB triggers or an edge function) that evaluates active rules on the
  relevant entity events and runs the actions (create_task, send_notification, update_field,
  block_transition, trigger_webhook, auto_graduate).
- **Lead assignment rules** (`lead_assignment_rules`) — rules can be created/toggled, but nothing
  routes new leads using them. Needs an assignment engine that applies active rules by priority
  on lead creation.

## Tabled — awaiting input

- **Rich offer / settlement builder.** Current state: a basic form (lump-sum vs payment plan,
  auto-equal monthly schedule, fee-collection method) + lifecycle actions (accept / attorney-
  approve / complete), each logged to the activity feed. **Waiting on GLG's production settlement
  calculator** to rebuild it properly. Target features:
  - Settlement math: enrolled balance → offer amount → settlement %, with a "client saves $X" summary.
  - Editable payment schedule (per-row date + amount, add/remove, running total reconciles to the offer).
  - Fee preview: contingency/attorney fee from the settlement, split across the schedule
    (`settlements.fee_start_offset_months` supports the offset).
  - Creditor/account context in the dialog header; configurable cadence (monthly/biweekly), not monthly-only.

## Built but partial

- **Activity log** — only records assignments, settlements, and eligibility decisions. Does NOT
  log status changes, document uploads, notes, or payments. Client rollup captures only NEW events
  (pre-migration rows have null `client_id`). Leads/litigation still use their own activity tables;
  not unified.
- **Litigation intake** — new fields (county, opposing counsel, service/response dates, opposing
  creditor) are on the CREATE form only; can't edit them on an existing matter yet. The
  `opposing_law_firm_id` / `opposing_contact_id` columns exist but aren't wired (only
  `opposing_creditor_id` is).
- **Workflow builder** — no rule **groups** UI (`workflow_rules.group_id` / `workflow_groups`
  exist; Lovable groups rules, e.g. "California Matters"). Status dropdown options are best-effort
  lists, not the app's real per-entity status enums.
- **Assignment rules** — create + enable/disable only; no edit of an existing rule; no weighted/
  skillset config UI beyond the basic fields.

## From the Lovable screenshots, never scoped

- **Settings hub** parity: Scoring profiles (debt-tier lead scoring), NSF Retry policy editor,
  Deadline Reminders, Appearance/themes (app is locked to light; Lovable has dark + holiday
  themes), Legal Teams kanban view, DocuSeal template management, Communications/Task template
  editors. (Some may partially exist from PR #31's Settings hub — unverified.)
- **Client detail parity**: Overview KPI stat cards (active engagements, total enrolled, %
  settled, in negotiation) and a Notes composer with @mention + send.

## Schema / environment

- **Live staging DB drift**: the live DB uses the `department_new` enum (values:
  administration, legal, sales, client_services, negotiations, operations), while the repo
  migrations define `public.department`. Migrations run against live must use bare enum literals
  (no `::public.department` cast). The auto-provision migration
  (`20260602100000_auto_provision_google_users.sql`) still casts to `::public.department` and will
  fail on live as written — fix to bare literals.
