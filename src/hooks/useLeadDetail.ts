import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { coreCrmKeys } from "./useCoreCrm";
import type { LeadActivityRow, LeadDebtRow, LeadDetailRow } from "@/lib/db-types";

const LEAD_DETAIL_COLS =
  "id, company_id, lead_number, first_name, last_name, email, phone, status, source, " +
  "interest_type, estimated_debt_amount, number_of_debts, has_active_lawsuit, in_bankruptcy, " +
  "lead_score, assigned_to, disqualification_reason, notes, state, monthly_income, " +
  "employment_status, created_at, updated_at, contacted_at, qualified_at, converted_at";
const ACTIVITY_COLS =
  "id, lead_id, staff_id, activity_type, outcome, notes, next_action, next_action_date, created_at";
const DEBT_COLS =
  "id, lead_id, creditor_name, account_type, original_balance, current_balance, account_number_last4, is_enrolled, created_at";

export const leadDetailKeys = {
  lead: (id: string) => ["lead", id] as const,
  activities: (id: string) => ["lead_activities", id] as const,
  debts: (id: string) => ["lead_debts", id] as const,
};

/** Single lead by id. RLS scopes to the caller's tenant. */
export function useLead(id: string | undefined): UseQueryResult<LeadDetailRow, Error> {
  return useQuery({
    queryKey: leadDetailKeys.lead(id ?? ""),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(LEAD_DETAIL_COLS)
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as LeadDetailRow;
    },
  });
}

/** Activity timeline for a lead, newest first. */
export function useLeadActivities(
  leadId: string | undefined,
): UseQueryResult<LeadActivityRow[], Error> {
  return useQuery({
    queryKey: leadDetailKeys.activities(leadId ?? ""),
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_activities")
        .select(ACTIVITY_COLS)
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as LeadActivityRow[];
    },
  });
}

/** Debts attached to a lead. */
export function useLeadDebts(leadId: string | undefined): UseQueryResult<LeadDebtRow[], Error> {
  return useQuery({
    queryKey: leadDetailKeys.debts(leadId ?? ""),
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_debts")
        .select(DEBT_COLS)
        .eq("lead_id", leadId!)
        .order("current_balance", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as LeadDebtRow[];
    },
  });
}

export interface NewActivityInput {
  lead_id: string;
  staff_id: string | null;
  activity_type: string;
  outcome?: string | null;
  notes?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
}

/** Log an activity against a lead. RLS: `Staff can access lead activities` (own tenant). */
export function useAddLeadActivity(): UseMutationResult<LeadActivityRow, Error, NewActivityInput> {
  const qc = useQueryClient();
  return useMutation<LeadActivityRow, Error, NewActivityInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from("lead_activities")
        .insert(input)
        .select(ACTIVITY_COLS)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as LeadActivityRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: leadDetailKeys.activities(row.lead_id) });
      qc.invalidateQueries({ queryKey: coreCrmKeys.leads });
    },
  });
}
