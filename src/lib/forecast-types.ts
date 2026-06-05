// Row + response types for the settlement forecasting engine UI. Hand-authored to match the
// engine's tables (migration 20260604180000) and the forecast-engine edge function, following the
// repo convention in src/lib/db-types.ts (generated types are gated on Docker).

export type AlertStatus = "open" | "acknowledged" | "resolved";
export type AlertSeverity = "critical" | "high" | "medium" | "low";

export interface ForecastAlertRow {
  id: string;
  company_id: string;
  contact_id: number;
  type: string;
  severity: AlertSeverity | string | null;
  breach_date: string | null;
  lead_days: number | null;
  shortfall_amount: number | null;
  threatened_offer_id: number | null;
  threatened_debt_id: number | null;
  status: AlertStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

/** An alert joined to its Cornerstone client (resolved via clients.forth_crm_id = contact_id). */
export interface ForecastAlertWithClient extends ForecastAlertRow {
  client_id: string | null;
  client_name: string | null;
}

export interface ProjectionRunRow {
  contact_id: number;
  company_id: string;
  min_balance: number | null;
  breach: boolean;
  additional_needed: number | null;
  headroom: number | null;
  breach_date: string | null;
  start_date: string | null;
  computed_at: string;
}

export interface EarnedFeeRow {
  id: string;
  company_id: string;
  settlement_offer_id: number;
  debt_id: number | null;
  contact_id: number;
  settled_amount: number | null;
  fee_rate: number;
  fee_amount: number;
  earned_on: string;
}

/** One point on the projected-balance timeline (fn_project_balance). */
export interface TimelinePoint {
  process_date: string;
  net_amount: number;
  record_source: string;
  running_balance: number;
}

/** fn_project_verdict result. */
export interface Verdict {
  min_balance: number | null;
  breach: boolean | null;
  additional_needed: number | null;
  headroom: number | null;
  breach_date: string | null;
  start_date: string | null;
}

export interface SolverProposal {
  lever: "adjust_recurring_draft" | "one_time_deposit";
  feasible: boolean;
  reason?: string;
  per_draft_increase?: number;
  drafts_affected?: number;
  total_added?: number;
  amount?: number;
  effective_by?: string;
  projected_min_after: number;
}

export interface SolverResult {
  breach: boolean;
  floor: number;
  min_balance: number;
  shortfall: number;
  proposals: SolverProposal[];
}
