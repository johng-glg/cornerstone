import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  ClientListRow,
  LeadListRow,
  LeadSource,
  LeadInterest,
  LiabilityListRow,
  ClientServiceListRow,
  TransactionListRow,
} from "@/lib/db-types";

/**
 * Core-CRM read hooks. Each fetches a company-scoped list (RLS enforces tenant isolation
 * server-side; these hooks never filter by company themselves). Column projections match the
 * row types in db-types.ts.
 */

export const coreCrmKeys = {
  clients: ["clients"] as const,
  leads: ["leads"] as const,
  liabilities: ["liabilities"] as const,
  clientServices: ["client_services"] as const,
  transactions: ["transactions"] as const,
};

const CLIENT_COLS =
  "id, company_id, first_name, last_name, email, status, is_active, forth_crm_id, created_at";
const LEAD_COLS =
  "id, company_id, lead_number, first_name, last_name, email, phone, status, source, interest_type, estimated_debt_amount, lead_score, created_at";
const LIABILITY_COLS =
  "id, client_service_id, current_creditor_id, liability_type, current_balance, enrolled_balance, status, created_at";
const CLIENT_SERVICE_COLS =
  "id, service_number, owning_company_id, primary_client_id, status, program_type, enrolled_date, escrow_balance, plsa_provider_id, created_at";
const TRANSACTION_COLS =
  "id, client_service_id, amount, transaction_type, status, scheduled_date, processed_at, external_id, plsa_provider_id, created_at";

async function fetchList<T>(table: string, columns: string, orderBy = "created_at"): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order(orderBy, { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export function useClients(): UseQueryResult<ClientListRow[], Error> {
  return useQuery({
    queryKey: coreCrmKeys.clients,
    queryFn: () => fetchList<ClientListRow>("clients", CLIENT_COLS),
  });
}

export function useLeads(): UseQueryResult<LeadListRow[], Error> {
  return useQuery({
    queryKey: coreCrmKeys.leads,
    queryFn: () => fetchList<LeadListRow>("leads", LEAD_COLS),
  });
}

export function useLiabilities(): UseQueryResult<LiabilityListRow[], Error> {
  return useQuery({
    queryKey: coreCrmKeys.liabilities,
    queryFn: () => fetchList<LiabilityListRow>("liabilities", LIABILITY_COLS),
  });
}

export function useClientServices(): UseQueryResult<ClientServiceListRow[], Error> {
  return useQuery({
    queryKey: coreCrmKeys.clientServices,
    queryFn: () => fetchList<ClientServiceListRow>("client_services", CLIENT_SERVICE_COLS),
  });
}

export function useTransactions(): UseQueryResult<TransactionListRow[], Error> {
  return useQuery({
    queryKey: coreCrmKeys.transactions,
    queryFn: () => fetchList<TransactionListRow>("transactions", TRANSACTION_COLS),
  });
}

/**
 * Fields a user supplies when creating a lead. The tenant (`company_id`) is stamped by the
 * caller from the active staff profile; `lead_number`, `status`, score, and auto-assignment
 * are all set server-side by triggers, so they are intentionally omitted here.
 */
export interface NewLeadInput {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  source: LeadSource;
  interest_type: LeadInterest;
  estimated_debt_amount?: number | null;
  state?: string | null;
  notes?: string | null;
}

/**
 * Create a lead in the caller's company. RLS (`Staff can manage company leads`) enforces that
 * `company_id` is the caller's own tenant. On success the leads list is invalidated so the new
 * row appears immediately.
 */
export function useCreateLead(
  companyId: string | undefined,
): UseMutationResult<LeadListRow, Error, NewLeadInput> {
  const qc = useQueryClient();
  return useMutation<LeadListRow, Error, NewLeadInput>({
    mutationFn: async (input) => {
      if (!companyId) throw new Error("No active company — cannot create a lead.");
      const { data, error } = await supabase
        .from("leads")
        .insert({ ...input, company_id: companyId })
        .select(LEAD_COLS)
        .single();
      if (error) throw new Error(error.message);
      return data as LeadListRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: coreCrmKeys.leads });
    },
  });
}
