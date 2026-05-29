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
