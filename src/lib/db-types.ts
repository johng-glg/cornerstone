// Focused, hand-authored row types for the core-CRM entities, matching the A5 schema
// (supabase/migrations/20260529100000_phase_a5_core_crm.sql). These are list-projection
// shapes — the columns the UI selects — not the full table rows.
//
// Interim: full generated `Database` types (`supabase gen types typescript`) require Docker,
// which this sandbox can't run (docs/open_questions.md B-A1). Regenerate the complete type
// set in CI / a Docker-capable environment; until then these projections keep the data layer
// strictly typed (no `any`).

export type ClientStatus = "active" | "inactive";

export interface ClientListRow {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  status: ClientStatus | null;
  is_active: boolean;
  forth_crm_id: string | null;
  created_at: string;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";
export type LeadSource = "web_form" | "referral" | "phone" | "advertisement" | "walk_in" | "other";
export type LeadInterest = "debt_resolution" | "litigation" | "both";

export interface LeadListRow {
  id: string;
  company_id: string;
  lead_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  source: LeadSource;
  interest_type: LeadInterest;
  estimated_debt_amount: number | null;
  lead_score: number | null;
  created_at: string;
}

export type LiabilityStatus =
  | "enrolled"
  | "in_negotiation"
  | "settled"
  | "in_litigation"
  | "dismissed"
  | "cancelled";

export interface LiabilityListRow {
  id: string;
  client_service_id: string;
  current_creditor_id: string | null;
  liability_type: string;
  current_balance: number | null;
  enrolled_balance: number | null;
  status: LiabilityStatus;
  created_at: string;
}

export type ServiceStatus = string;

export interface ClientServiceListRow {
  id: string;
  service_number: string;
  owning_company_id: string;
  primary_client_id: string | null;
  status: ServiceStatus;
  program_type: string | null;
  enrolled_date: string | null;
  escrow_balance: number | null;
  plsa_provider_id: string;
  created_at: string;
}

export type TransactionStatus = "open" | "pending" | "cleared" | "cancelled";

export interface TransactionListRow {
  id: string;
  client_service_id: string;
  amount: number;
  transaction_type: string;
  status: TransactionStatus;
  scheduled_date: string | null;
  processed_at: string | null;
  external_id: string | null;
  plsa_provider_id: string;
  created_at: string;
}

// ── Domains landed since A5 (A8 litigation, A10 templates/signatures/notifications) ──────────

export type LitigationStatus =
  | "new"
  | "pre_response"
  | "post_response"
  | "settled"
  | "dropped"
  | "judgment"
  | "declined"
  | "dismissed";

export interface LitigationMatterListRow {
  id: string;
  client_service_id: string;
  liability_id: string;
  case_number: string | null;
  court_name: string | null;
  state: string | null;
  opposing_party: string | null;
  status: LitigationStatus;
  response_deadline: string | null;
  next_hearing_date: string | null;
  created_at: string;
}

export type TemplateType = "email" | "sms" | "document";
export type TemplateLanguage = "en" | "es";

export interface TemplateListRow {
  id: string;
  company_id: string;
  name: string;
  template_type: TemplateType;
  language: TemplateLanguage;
  is_active: boolean;
  current_version: number;
  updated_at: string;
}

export type SignatureRequestStatus =
  | "draft"
  | "queued"
  | "sent"
  | "viewed"
  | "partially_signed"
  | "completed"
  | "declined"
  | "expired"
  | "canceled"
  | "error";

export interface SignatureRequestListRow {
  id: string;
  company_id: string;
  title: string;
  entity_type: string;
  status: SignatureRequestStatus;
  completed_at: string | null;
  created_at: string;
}

export interface NotificationListRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}
