// Single source of truth for the in-app Developer/Docs portal.
//
// Everything here is hand-kept in sync with the live Supabase schema (supabase/migrations/**),
// the edge functions (supabase/functions/**), and the role lens in src/lib/auth.tsx. It is
// reference documentation, not a runtime contract — when the schema changes, update this file.

import {
  Database,
  GitBranch,
  ListTree,
  FunctionSquare,
  Code2,
  Shield,
  KeyRound,
  Users,
  HardDrive,
  Lock,
  BookOpen,
  Plug,
  Rocket,
  type LucideIcon,
} from "lucide-react";

export interface DocSection {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

/** The portal's top-level map — drives the overview cards and the secondary sidebar. */
export const DOC_SECTIONS: DocSection[] = [
  { title: "Overview", description: "Start here.", href: "/docs", icon: BookOpen },
  {
    title: "ERD",
    description:
      "How the core tables relate — lead → client → engagement → liability → settlement.",
    href: "/docs/erd",
    icon: GitBranch,
  },
  {
    title: "Database Schema",
    description: "Every table, grouped by domain, with a one-line purpose.",
    href: "/docs/schema",
    icon: Database,
  },
  {
    title: "Enums",
    description: "All Postgres enum types and their allowed values.",
    href: "/docs/enums",
    icon: ListTree,
  },
  {
    title: "Database Functions",
    description: "SECURITY DEFINER helpers, triggers, and RPCs.",
    href: "/docs/functions",
    icon: FunctionSquare,
  },
  {
    title: "Edge Functions",
    description: "Deno functions that bridge Forth, Dialpad, DocuSeal, and the PLSA.",
    href: "/docs/edge-functions",
    icon: Code2,
  },
  {
    title: "RLS Policies",
    description: "How tenant isolation is enforced row-by-row.",
    href: "/docs/rls-policies",
    icon: Shield,
  },
  {
    title: "Permissions Matrix",
    description: "What each role can do, at a glance.",
    href: "/docs/permissions",
    icon: KeyRound,
  },
  {
    title: "Role Guides",
    description: "Per-role workflows and primary modules.",
    href: "/docs/roles/admin",
    icon: Users,
  },
  {
    title: "Storage",
    description: "Document buckets and path-scoped access.",
    href: "/docs/storage",
    icon: HardDrive,
  },
  {
    title: "Security",
    description: "Auth, PII encryption, rate limiting, and audit.",
    href: "/docs/security",
    icon: Lock,
  },
  {
    title: "Feature Guides",
    description: "Module-by-module product documentation.",
    href: "/docs/features/leads",
    icon: BookOpen,
  },
  {
    title: "Integrations",
    description: "Forth, Dialpad, DocuSeal, and PLSA processors.",
    href: "/docs/integrations",
    icon: Plug,
  },
  {
    title: "Future Builds",
    description: "Roadmap and outstanding work.",
    href: "/docs/future-builds",
    icon: Rocket,
  },
];

// ─── Roles ────────────────────────────────────────────────────────────────────
// Mirrors app_role enum + ROLE_VIEWS in src/lib/auth.tsx.

export interface RoleDoc {
  key: string;
  label: string;
  department: string;
  summary: string;
  responsibilities: string[];
  modules: string[];
}

export const ROLES: RoleDoc[] = [
  {
    key: "admin",
    label: "Administrator",
    department: "Administration",
    summary:
      "Full tenant access. Configures the firm, manages staff and roles, and oversees every module.",
    responsibilities: [
      "Manage staff, roles, and role-special permissions",
      "Configure companies, services, creditors, and integrations",
      "Review reconciliation findings and the audit log",
      "Triage feature requests and tune workflow rules",
    ],
    modules: ["Companies", "Staff", "Settings", "Integrations", "Reports", "Documentation"],
  },
  {
    key: "attorney",
    label: "Attorney",
    department: "Legal",
    summary: "Owns litigation matters and legal strategy for assigned clients.",
    responsibilities: [
      "Manage litigation matters, hearings, and filings",
      "Approve filing fees and review appearances",
      "Supervise paralegals and case managers",
    ],
    modules: ["Litigation", "Court Calendar", "Clients", "Tasks"],
  },
  {
    key: "case_manager",
    label: "Case Manager",
    department: "Case Management",
    summary: "Shepherds clients through their engagement lifecycle.",
    responsibilities: [
      "Track engagement status and graduation readiness",
      "Coordinate client communications and documents",
      "Keep tasks and deadlines current",
    ],
    modules: ["Clients", "Engagements", "Tasks", "Liabilities"],
  },
  {
    key: "paralegal",
    label: "Paralegal / Legal Staff",
    department: "Legal",
    summary: "Supports attorneys with document prep and litigation logistics.",
    responsibilities: [
      "Draft and file litigation documents",
      "Maintain the court calendar and deadline reminders",
      "Prepare appearance requests",
    ],
    modules: ["Litigation", "Court Calendar", "Tasks"],
  },
  {
    key: "sales_rep",
    label: "Sales Rep",
    department: "Sales / Intake",
    summary: "Captures and qualifies leads through the enrollment funnel.",
    responsibilities: [
      "Intake leads and capture debts, banking, and budget",
      "Run the 8-step Consumer Defense enrollment",
      "Submit leads for eligibility review",
    ],
    modules: ["Leads", "Lead Metrics", "Eligibility Reviews"],
  },
  {
    key: "negotiator",
    label: "Negotiator",
    department: "Negotiations",
    summary: "Works creditor settlements on enrolled liabilities.",
    responsibilities: [
      "Log creditor responses and settlement offers",
      "Track settlement status to completion",
      "Coordinate payment authorization with processing",
    ],
    modules: ["Liabilities", "Creditors", "Clients"],
  },
  {
    key: "payment_processor",
    label: "Payment Processor",
    department: "Payment Processing",
    summary: "Manages PLSA escrow movement, settlements, and NSF retries.",
    responsibilities: [
      "Reconcile transactions and payment schedules",
      "Handle NSF retries per policy",
      "Disburse settlement payments to creditors",
    ],
    modules: ["Payments", "Transactions", "Billing"],
  },
  {
    key: "correspondent",
    label: "Correspondence",
    department: "Correspondence",
    summary: "Handles inbound/outbound client and creditor communication.",
    responsibilities: [
      "Send templated emails and SMS",
      "Log communications across entities",
      "Manage signature requests",
    ],
    modules: ["Templates", "Signatures", "Clients"],
  },
  {
    key: "client_services_rep",
    label: "Client Services Rep",
    department: "Client Services",
    summary: "First line of client support and retention.",
    responsibilities: [
      "Answer client questions and resolve issues",
      "Update client records and contact preferences",
      "Flag retention risk",
    ],
    modules: ["Clients", "Engagements", "Tasks"],
  },
  {
    key: "viewer",
    label: "Viewer",
    department: "Administration",
    summary: "Read-only access for auditors and observers.",
    responsibilities: ["View records across modules", "No create, update, or delete"],
    modules: ["Dashboard", "Reports"],
  },
];

// ─── Schema (tables grouped by domain) ─────────────────────────────────────────

export interface TableDoc {
  name: string;
  desc: string;
}
export interface TableGroup {
  group: string;
  tables: TableDoc[];
}

export const TABLE_GROUPS: TableGroup[] = [
  {
    group: "Leads & Intake",
    tables: [
      { name: "leads", desc: "Prospective clients moving through the intake funnel." },
      { name: "lead_activities", desc: "Timeline of touches and status transitions on a lead." },
      { name: "lead_debts", desc: "Self-reported debts captured during intake." },
      { name: "lead_banking", desc: "Encrypted banking details for draft setup." },
      { name: "lead_budgets", desc: "Income/expense budget for affordability." },
      { name: "lead_disclosures", desc: "Required disclosures acknowledged at enrollment." },
      { name: "lead_documents", desc: "Files uploaded against a lead (lead-documents bucket)." },
      {
        name: "lead_scoring_profiles",
        desc: "Scoring weight profiles used by calculate_lead_score.",
      },
      {
        name: "lead_assignment_rules",
        desc: "Round-robin / weighted assignment rule definitions.",
      },
      { name: "lead_assignment_pool", desc: "Eligible reps per rule." },
      { name: "lead_assignment_queue", desc: "Leads awaiting assignment." },
      { name: "lead_assignment_log", desc: "Audit of every assignment action." },
      { name: "eligibility_reviews", desc: "Underwriting review submissions and decisions." },
    ],
  },
  {
    group: "Clients",
    tables: [
      { name: "clients", desc: "Converted leads — the firm's customers (SSN encrypted)." },
      { name: "client_addresses", desc: "Home / mailing / work addresses." },
      { name: "client_phones", desc: "Phone numbers by type." },
      { name: "client_communications", desc: "Logged calls, emails, SMS, and meetings." },
      { name: "client_documents", desc: "Files for a client (client-documents bucket)." },
      { name: "client_service_clients", desc: "Links co-clients/spouses to an engagement." },
      { name: "entity_communications", desc: "Polymorphic communication log across entities." },
    ],
  },
  {
    group: "Engagements & Services",
    tables: [
      {
        name: "client_services",
        desc: "A client's engagement (debt resolution / consumer defense).",
      },
      { name: "services", desc: "Catalog of offered service types." },
      { name: "client_service_types", desc: "Join of engagements to catalog service types." },
      { name: "service_status_history", desc: "Status change trail for engagements." },
      {
        name: "graduation_automation_config",
        desc: "Rules that auto-graduate completed engagements.",
      },
      { name: "graduation_events", desc: "Recorded graduation milestones." },
    ],
  },
  {
    group: "Liabilities, Creditors & Settlements",
    tables: [
      { name: "liabilities", desc: "Enrolled debts being resolved or litigated." },
      { name: "liability_actions", desc: "Actions taken on a liability." },
      { name: "creditors", desc: "Creditor / collector directory." },
      { name: "creditor_contacts", desc: "People at a creditor." },
      { name: "creditor_responses", desc: "Inbound/outbound creditor correspondence." },
      { name: "settlements", desc: "Settlement offers and their lifecycle." },
    ],
  },
  {
    group: "Litigation",
    tables: [
      { name: "litigation_matters", desc: "Lawsuits / defense matters tied to a liability." },
      { name: "litigation_activities", desc: "Matter timeline events." },
      {
        name: "litigation_documents",
        desc: "Pleadings and filings (litigation-documents bucket).",
      },
      { name: "litigation_hearings", desc: "Scheduled hearings and outcomes." },
      { name: "litigation_teams", desc: "Named teams for matter routing." },
      { name: "litigation_team_members", desc: "Staff membership in litigation teams." },
      { name: "appearance_requests", desc: "Requests for attorney appearances." },
      { name: "filing_fees", desc: "Court filing fees and approval status." },
      { name: "law_firms", desc: "Co-counsel / opposing firms." },
      { name: "law_firm_contacts", desc: "Contacts at external firms." },
      { name: "deadline_reminders", desc: "Generated response/hearing deadline reminders." },
    ],
  },
  {
    group: "Billing & Payments",
    tables: [
      { name: "billing_entries", desc: "Time and expense entries." },
      { name: "transactions", desc: "PLSA escrow transactions (drafts, fees, settlements)." },
      { name: "payment_processors", desc: "Configured PLSA / processor providers." },
      { name: "payment_schedules", desc: "Recurring draft schedules." },
      { name: "company_processor_configs", desc: "Encrypted processor credentials per company." },
      { name: "transaction_retry_attempts", desc: "Retry history for failed transactions." },
      { name: "nsf_retry_policies", desc: "NSF retry cadence rules." },
      { name: "plsa_sync_log", desc: "Sync log between Cornerstone and the PLSA." },
    ],
  },
  {
    group: "Tasks, Notes & Workflow",
    tables: [
      { name: "tasks", desc: "Work items assigned to staff." },
      { name: "task_templates", desc: "Reusable task definitions." },
      { name: "notes", desc: "Free-form notes across entities." },
      { name: "note_mentions", desc: "@mentions that fire notifications." },
      { name: "assignments", desc: "Polymorphic staff-to-entity assignments." },
      { name: "workflow_rules", desc: "Trigger → condition → action automation rules." },
      { name: "workflow_groups", desc: "Grouping of related workflow rules." },
      { name: "workflow_executions", desc: "Audit of rule evaluations and outcomes." },
      { name: "domain_events", desc: "Emitted domain events (the event spine)." },
    ],
  },
  {
    group: "Templates, Signatures & Email",
    tables: [
      { name: "templates", desc: "Email / SMS / document templates." },
      { name: "template_categories", desc: "Template grouping." },
      { name: "template_versions", desc: "Version history of templates." },
      { name: "template_usages", desc: "Log of where/when a template was used." },
      { name: "report_templates", desc: "Saved report configurations." },
      { name: "terminology_presets", desc: "Per-tenant label remapping." },
      { name: "docuseal_templates", desc: "Mapped DocuSeal document templates." },
      { name: "signature_requests", desc: "E-signature envelopes." },
      { name: "signature_signers", desc: "Signers on a request." },
      { name: "signature_events", desc: "Signer lifecycle events from webhooks." },
      { name: "email_send_log", desc: "Per-message send log." },
      { name: "email_send_state", desc: "Idempotency / delivery state per message." },
      { name: "email_unsubscribe_tokens", desc: "Signed unsubscribe tokens." },
      { name: "suppressed_emails", desc: "Suppression list (bounces / unsubscribes)." },
    ],
  },
  {
    group: "Integrations",
    tables: [
      { name: "integration_providers", desc: "Catalog of available integrations." },
      { name: "company_integrations", desc: "Per-tenant enable/disable + config." },
      { name: "integration_event_log", desc: "Inbound/outbound integration events." },
      { name: "dialpad_calls", desc: "Call records synced from Dialpad." },
      { name: "webhook_endpoints", desc: "Registered outbound webhook targets." },
      { name: "outbound_webhook_log", desc: "Delivery log for outbound webhooks." },
    ],
  },
  {
    group: "Notifications",
    tables: [
      { name: "notifications", desc: "In-app notifications per user." },
      { name: "notification_preferences", desc: "Per-user channel/type preferences." },
      { name: "reminder_settings", desc: "Tenant reminder cadence defaults." },
    ],
  },
  {
    group: "Staff & Access Control",
    tables: [
      { name: "staff", desc: "Employee profiles linked to auth users." },
      { name: "companies", desc: "Tenant firms and affiliates." },
      { name: "user_roles", desc: "Role grants per user (drives has_role)." },
      { name: "role_permissions", desc: "Base capability matrix per role." },
      { name: "role_special_permissions", desc: "Per-staff overrides." },
      { name: "job_titles", desc: "HR job-title reference." },
    ],
  },
  {
    group: "Platform & Operations",
    tables: [
      { name: "platform_admins", desc: "Cross-tenant super-admins (service-role managed)." },
      { name: "tenant_feature_flags", desc: "Per-tenant feature toggles." },
      { name: "feature_flag_catalog", desc: "Available feature flags." },
      { name: "feature_requests", desc: "Staff-submitted product requests." },
      { name: "system_audit_log", desc: "Append-only audit trail." },
      { name: "rate_limit_counters", desc: "Token-bucket counters for rate limiting." },
      { name: "reconciliation_findings", desc: "Data-integrity findings from detectors." },
    ],
  },
];

// ─── Enums ─────────────────────────────────────────────────────────────────────

export interface EnumDoc {
  name: string;
  values: string[];
}

export const ENUMS: EnumDoc[] = [
  {
    name: "app_role",
    values: [
      "admin",
      "attorney",
      "paralegal",
      "negotiator",
      "case_manager",
      "sales_rep",
      "client_services_rep",
      "payment_processor",
      "correspondent",
      "viewer",
    ],
  },
  {
    name: "department",
    values: [
      "admin",
      "sales_intake",
      "client_services",
      "attorney",
      "case_manager",
      "negotiations",
      "payment_processing",
      "correspondence",
    ],
  },
  {
    name: "lead_status",
    values: [
      "new",
      "contacted",
      "qualified",
      "intake",
      "credit_review",
      "plan_selection",
      "eligibility_review",
      "qc_pending",
      "docs_pending",
      "converted",
      "lost",
    ],
  },
  {
    name: "lead_source",
    values: ["web_form", "referral", "phone", "advertisement", "walk_in", "other"],
  },
  { name: "lead_interest", values: ["debt_resolution", "litigation", "both"] },
  { name: "service_type", values: ["debt_resolution", "consumer_defense"] },
  {
    name: "service_status",
    values: [
      "prospect",
      "active",
      "suspended",
      "closed",
      "pending",
      "graduated",
      "dropped",
      "cancelled",
    ],
  },
  { name: "plan_type", values: ["glg_standard", "glg_adjustable", "glg_exception"] },
  { name: "client_status_enum", values: ["active", "inactive"] },
  {
    name: "liability_type",
    values: [
      "credit_card",
      "medical",
      "auto_loan",
      "personal_loan",
      "student_loan",
      "mortgage",
      "other",
    ],
  },
  {
    name: "liability_status",
    values: ["enrolled", "in_negotiation", "settled", "in_litigation", "dismissed", "cancelled"],
  },
  {
    name: "creditor_type",
    values: ["original_creditor", "collection_agency", "law_firm", "debt_buyer"],
  },
  {
    name: "settlement_status",
    values: ["offered", "accepted", "rejected", "completed", "defaulted", "cancelled"],
  },
  {
    name: "litigation_status",
    values: [
      "new",
      "pre_response",
      "post_response",
      "settled",
      "dropped",
      "judgment",
      "declined",
      "dismissed",
    ],
  },
  {
    name: "appearance_request_status",
    values: ["pending", "approved", "assigned", "completed", "cancelled"],
  },
  {
    name: "filing_fee_status",
    values: ["pending", "submitted_to_client", "approved", "declined", "paid"],
  },
  {
    name: "transaction_type",
    values: [
      "draft",
      "processor_fee",
      "settlement_payment",
      "contingency_fee",
      "loan_disbursement",
      "loan_settlement_payment",
      "loan_fee_collection",
    ],
  },
  { name: "transaction_status", values: ["open", "pending", "cleared", "cancelled"] },
  { name: "payment_status_enum", values: ["current", "paused", "nsf", "past_due", "suspended"] },
  { name: "payment_frequency_enum", values: ["monthly", "semi_monthly", "bi_weekly"] },
  { name: "billing_entry_type", values: ["time", "expense"] },
  { name: "billing_entry_status", values: ["draft", "approved", "invoiced", "paid"] },
  {
    name: "task_type",
    values: [
      "follow_up",
      "document_review",
      "court_deadline",
      "settlement_negotiation",
      "client_call",
      "general",
    ],
  },
  { name: "task_status", values: ["pending", "in_progress", "completed", "cancelled"] },
  { name: "task_priority", values: ["low", "medium", "high", "urgent"] },
  { name: "communication_type", values: ["call", "email", "sms", "meeting", "note"] },
  { name: "communication_direction", values: ["inbound", "outbound"] },
  {
    name: "notification_type",
    values: [
      "task_assigned",
      "task_due_soon",
      "task_overdue",
      "lead_assigned",
      "matter_assigned",
      "hearing_reminder",
      "settlement_update",
      "mention",
      "system_alert",
      "response_deadline_reminder",
    ],
  },
  { name: "template_type", values: ["email", "sms", "document"] },
  { name: "template_language", values: ["en", "es"] },
  {
    name: "signature_request_status",
    values: [
      "draft",
      "queued",
      "sent",
      "viewed",
      "partially_signed",
      "completed",
      "declined",
      "expired",
      "canceled",
      "error",
    ],
  },
  { name: "signer_status", values: ["pending", "sent", "viewed", "signed", "declined"] },
  {
    name: "assignment_method",
    values: ["round_robin", "weighted", "backlog_based", "skillset_match"],
  },
  {
    name: "assignment_type",
    values: [
      "primary_attorney",
      "litigation_attorney",
      "client_services_rep",
      "case_manager",
      "negotiator",
      "sales_rep",
    ],
  },
  {
    name: "workflow_trigger_type",
    values: ["status_changed", "field_updated", "record_created", "time_based", "manual"],
  },
  {
    name: "workflow_action_type",
    values: [
      "create_task",
      "send_notification",
      "update_field",
      "block_transition",
      "trigger_webhook",
      "auto_graduate",
    ],
  },
  {
    name: "workflow_entity_type",
    values: [
      "leads",
      "client_services",
      "liabilities",
      "litigation_matters",
      "tasks",
      "settlements",
    ],
  },
  { name: "workflow_execution_status", values: ["success", "blocked", "failed", "skipped"] },
  {
    name: "feature_request_status",
    values: ["submitted", "under_review", "planned", "in_progress", "completed", "declined"],
  },
  { name: "company_type", values: ["law_firm", "affiliate", "financing_company"] },
  { name: "data_visibility", values: ["own_only", "parent_and_own", "full_hierarchy"] },
  { name: "entity_type", values: ["engagement", "case", "liability", "lead", "litigation_matter"] },
];

// ─── Database functions ─────────────────────────────────────────────────────────

export interface FnDoc {
  name: string;
  desc: string;
}
export interface FnGroup {
  group: string;
  fns: FnDoc[];
}

export const FUNCTION_GROUPS: FnGroup[] = [
  {
    group: "Access control (SECURITY DEFINER)",
    fns: [
      { name: "has_role(user, role)", desc: "True if the user holds the given app_role." },
      {
        name: "can_access_company(user, company)",
        desc: "Core tenant-isolation check used by most RLS policies.",
      },
      { name: "can_view_leads(user)", desc: "Whether the user may see leads." },
      { name: "get_user_company_id(user)", desc: "Resolves a user's company." },
      {
        name: "resolve_entity_company_id(type, id)",
        desc: "Polymorphic company lookup for any entity.",
      },
      { name: "is_platform_admin(user)", desc: "Cross-tenant super-admin check." },
      { name: "can_access_storage_object(name)", desc: "Path-scoped storage access guard." },
    ],
  },
  {
    group: "Leads & assignment",
    fns: [
      { name: "generate_lead_number()", desc: "Allocates the next lead number." },
      { name: "calculate_lead_score(lead)", desc: "Scores a lead from its scoring profile." },
      { name: "assign_lead(lead)", desc: "Applies assignment rules to a lead." },
      { name: "process_assignment_queue()", desc: "Drains the assignment queue." },
      { name: "track_lead_status_transition()", desc: "Trigger logging lead status changes." },
      { name: "trigger_auto_assign_lead()", desc: "Auto-assigns on insert." },
      { name: "trigger_calculate_lead_score()", desc: "Recomputes score on change." },
      {
        name: "convert_lead_to_client(lead, …)",
        desc: "The enrollment conversion RPC (lead → client + engagement).",
      },
    ],
  },
  {
    group: "Engagements & status",
    fns: [
      { name: "generate_service_number()", desc: "Allocates the next engagement number." },
      { name: "update_client_status()", desc: "Derives client status from engagements." },
      { name: "validate_status_transition()", desc: "Enforces legal status moves." },
      { name: "get_company_terminology(company)", desc: "Returns the tenant's label map." },
    ],
  },
  {
    group: "Workflow & events",
    fns: [
      { name: "emit_domain_event(…)", desc: "Writes to the domain_events spine." },
      { name: "evaluate_workflow_conditions(…)", desc: "Evaluates a rule's conditions." },
      { name: "check_trigger_match(…)", desc: "Matches an event to workflow triggers." },
      { name: "create_notification(…)", desc: "Inserts an in-app notification." },
      { name: "notify_task_assignment()", desc: "Notifies on task assignment." },
      { name: "notify_matter_assignment()", desc: "Notifies on matter assignment." },
      { name: "notify_note_mention()", desc: "Notifies @mentioned staff." },
      { name: "generate_deadline_reminders()", desc: "Creates response/hearing reminders." },
    ],
  },
  {
    group: "Payments & reconciliation",
    fns: [
      { name: "calc_creditor_response_time()", desc: "Computes creditor turnaround." },
      { name: "move_to_dlq(…)", desc: "Routes failed messages to a dead-letter queue." },
    ],
  },
  {
    group: "PII, audit & rate limiting",
    fns: [
      { name: "encrypt_pii(text)", desc: "Encrypts a PII value." },
      { name: "decrypt_client_ssn(client)", desc: "Decrypts a client SSN (guarded)." },
      { name: "decrypt_lead_banking(lead)", desc: "Decrypts lead banking (guarded)." },
      { name: "decrypt_processor_credentials(cfg)", desc: "Decrypts processor creds (guarded)." },
      { name: "assert_no_plaintext_pii()", desc: "Trigger blocking plaintext PII writes." },
      { name: "log_audit_event(…)", desc: "Writes to system_audit_log." },
      { name: "audit_trigger_fn()", desc: "Generic audit trigger." },
      { name: "check_rate_limit(key, …)", desc: "Token-bucket rate-limit check." },
    ],
  },
  {
    group: "Multi-tenant platform",
    fns: [
      { name: "provision_tenant(…)", desc: "Creates a new tenant + seed config." },
      { name: "delete_tenant_data(company)", desc: "Hard-deletes a tenant's data." },
      { name: "export_tenant_data(company)", desc: "Exports a tenant's data." },
      { name: "resolve_tenant_by_subdomain(sub)", desc: "Maps subdomain → tenant." },
      { name: "effective_feature_flag(flag, company)", desc: "Resolves a flag for a tenant." },
      { name: "is_feature_enabled(flag)", desc: "Boolean flag check for the caller." },
    ],
  },
  {
    group: "Email pipeline",
    fns: [
      { name: "enqueue_email(…)", desc: "Queues an outbound email." },
      { name: "read_email_batch(n)", desc: "Claims a batch for the sender." },
      { name: "delete_email(id)", desc: "Removes a queued email." },
    ],
  },
];

// ─── Edge functions ─────────────────────────────────────────────────────────────

export interface EdgeFnDoc {
  name: string;
  vendor: string;
  desc: string;
}

export const EDGE_FUNCTIONS: EdgeFnDoc[] = [
  { name: "forth-auth", vendor: "Forth", desc: "Obtains/refreshes a Forth API token." },
  { name: "forth-register-client", vendor: "Forth", desc: "Registers a client in Forth." },
  { name: "forth-sync-client", vendor: "Forth", desc: "Pushes client updates to Forth." },
  { name: "forth-create-draft", vendor: "Forth", desc: "Creates a draft payment plan." },
  { name: "forth-update-draft", vendor: "Forth", desc: "Updates an existing draft." },
  { name: "forth-cancel-draft", vendor: "Forth", desc: "Cancels a draft." },
  { name: "forth-pause-resume", vendor: "Forth", desc: "Pauses or resumes drafting." },
  { name: "forth-fetch-balance", vendor: "Forth", desc: "Reads escrow balance." },
  { name: "forth-poll-transactions", vendor: "Forth", desc: "Polls for new transactions." },
  { name: "forth-payment-to-creditor", vendor: "Forth", desc: "Disburses a settlement payment." },
  { name: "forth-contact-update", vendor: "Forth", desc: "Updates a Forth contact." },
  { name: "forth-contact-close", vendor: "Forth", desc: "Closes a Forth contact." },
  { name: "forth-test-connection", vendor: "Forth", desc: "Validates Forth credentials." },
  { name: "dialpad-initiate", vendor: "Dialpad", desc: "Starts an outbound call." },
  { name: "dialpad-webhook", vendor: "Dialpad", desc: "Receives call events → dialpad_calls." },
  { name: "dialpad-test-connection", vendor: "Dialpad", desc: "Validates Dialpad credentials." },
  { name: "docuseal-send", vendor: "DocuSeal", desc: "Sends a document for signature." },
  {
    name: "docuseal-webhook",
    vendor: "DocuSeal",
    desc: "Receives signer events → signature_events.",
  },
  { name: "docuseal-test", vendor: "DocuSeal", desc: "Validates DocuSeal credentials." },
  { name: "plsa-adapter-mock", vendor: "PLSA", desc: "Local mock of a payment processor." },
  { name: "plsa-escrow-sync", vendor: "PLSA", desc: "Syncs escrow balances and drafts." },
  { name: "plsa-nsf-retry", vendor: "PLSA", desc: "Retries NSF transactions per policy." },
  { name: "plsa-reconciliation", vendor: "PLSA", desc: "Reconciles ledger vs processor." },
  { name: "plsa-routing", vendor: "PLSA", desc: "Routes a tenant to its processor adapter." },
  { name: "provision-tenant", vendor: "Platform", desc: "Provisions a new tenant end-to-end." },
];

// ─── Feature guides ──────────────────────────────────────────────────────────────

export interface FeatureDoc {
  key: string;
  label: string;
  summary: string;
  workflow: string[];
}

export const FEATURES: FeatureDoc[] = [
  {
    key: "leads",
    label: "Lead Management",
    summary: "Capture, score, assign, and qualify prospective clients before enrollment.",
    workflow: [
      "Create a lead from a web form, referral, or call",
      "Capture debts, banking, budget, and disclosures",
      "Auto-score and auto-assign via assignment rules",
      "Advance the status funnel to eligibility review",
    ],
  },
  {
    key: "enrollment",
    label: "Enrollment",
    summary:
      "The 8-step Consumer Defense flow that converts a qualified lead into a client and engagement.",
    workflow: [
      "Verify identity and contact details",
      "Confirm debts and select a plan (glg_standard / adjustable / exception)",
      "Collect disclosures and signatures",
      "Call convert_lead_to_client → client + client_services row",
    ],
  },
  {
    key: "clients",
    label: "Client Workspace",
    summary:
      "The 360° client record: contacts, engagements, liabilities, documents, and communications.",
    workflow: [
      "Review engagement status and payment health",
      "Manage liabilities and settlements",
      "Log communications and upload documents",
      "Track tasks and graduation readiness",
    ],
  },
  {
    key: "settlements",
    label: "Settlement Negotiation",
    summary: "Negotiate creditor settlements on enrolled liabilities.",
    workflow: [
      "Log creditor responses against a liability",
      "Record a settlement offer and track its status",
      "On acceptance, authorize a settlement payment",
      "Disburse via forth-payment-to-creditor",
    ],
  },
  {
    key: "litigation",
    label: "Litigation Management",
    summary: "Manage defense matters, hearings, filings, and the court calendar.",
    workflow: [
      "Open a matter against a liability",
      "Track hearings on the court calendar",
      "File documents and request appearances",
      "Approve filing fees and log activity",
    ],
  },
  {
    key: "billing",
    label: "Billing & Payments",
    summary: "Time/expense capture and PLSA escrow transactions.",
    workflow: [
      "Record billable time and expenses",
      "Manage payment schedules and drafts",
      "Handle NSF retries per policy",
      "Reconcile transactions against the processor",
    ],
  },
];

// ─── Future builds ────────────────────────────────────────────────────────────────

export interface FutureItem {
  title: string;
  status: "planned" | "in_progress" | "blocked";
  detail: string;
}

export const FUTURE_BUILDS: FutureItem[] = [
  {
    title: "Live vendor integrations",
    status: "blocked",
    detail:
      "Forth / Dialpad / DocuSeal go live once vendor API keys and the Supabase access token are set as function secrets.",
  },
  {
    title: "Three-environment Terraform infra",
    status: "blocked",
    detail: "dev / staging / production via Terraform — pending the Q-F1/Q-F2 platform decisions.",
  },
  {
    title: "Compliance attestation pack",
    status: "planned",
    detail: "SOC2-style attestation and data-handling documentation (Q-A5).",
  },
  {
    title: "Full pgTAP coverage",
    status: "in_progress",
    detail: "RLS and function unit tests; full run is blocked in the sandbox (no local Postgres).",
  },
];

// ─── Integrations ──────────────────────────────────────────────────────────────────

export interface IntegrationDoc {
  name: string;
  category: string;
  summary: string;
  secrets: string[];
}

export const INTEGRATIONS: IntegrationDoc[] = [
  {
    name: "Forth",
    category: "Payment / CRM sync",
    summary: "Two-way client and draft sync plus settlement disbursement.",
    secrets: ["FORTH_CLIENT_ID", "FORTH_API_KEY"],
  },
  {
    name: "Dialpad",
    category: "Telephony",
    summary: "Click-to-call and inbound call events with screen-pop.",
    secrets: ["DIALPAD_API_TOKEN", "DIALPAD_WEBHOOK_SECRET"],
  },
  {
    name: "DocuSeal",
    category: "E-signature",
    summary: "Send documents for signature and track signer events.",
    secrets: ["DOCUSEAL_API_TOKEN", "DOCUSEAL_WEBHOOK_SECRET"],
  },
  {
    name: "PLSA",
    category: "Escrow processor",
    summary: "Pluggable payment processor adapter for escrow drafting and reconciliation.",
    secrets: ["(per-tenant, in company_processor_configs)"],
  },
];

// ─── Storage ───────────────────────────────────────────────────────────────────────

export interface BucketDoc {
  id: string;
  public: boolean;
  desc: string;
}

export const BUCKETS: BucketDoc[] = [
  { id: "client-documents", public: false, desc: "Client files — IDs, statements, agreements." },
  { id: "lead-documents", public: false, desc: "Documents captured during intake." },
  { id: "litigation-documents", public: false, desc: "Pleadings and court filings." },
];
