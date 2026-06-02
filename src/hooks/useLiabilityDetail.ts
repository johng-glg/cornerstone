import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Single-liability ("debt") detail: the record, its creditor, action history, and creating a
// litigation matter from it. Settlements + notes reuse useSettlements / useEntityNotes.

export interface LiabilityDetailRow {
  id: string;
  account_number: string | null;
  liability_type: string;
  status: string;
  original_balance: number | null;
  current_balance: number | null;
  enrolled_balance: number | null;
  notes: string | null;
  client_service_id: string;
  summons_received_at: string | null;
  creditor: { name: string } | null;
}

export function useLiability(id: string | undefined): UseQueryResult<LiabilityDetailRow, Error> {
  return useQuery({
    queryKey: ["liability", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liabilities")
        .select(
          "id, account_number, liability_type, status, original_balance, current_balance, enrolled_balance, notes, client_service_id, summons_received_at, creditor:creditors!current_creditor_id(name)",
        )
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as LiabilityDetailRow;
    },
  });
}

export interface LiabilityActionRow {
  id: string;
  action_type: string;
  description: string | null;
  amount: number | null;
  created_at: string;
}

export function useLiabilityActions(
  id: string | undefined,
): UseQueryResult<LiabilityActionRow[], Error> {
  return useQuery({
    queryKey: ["liability_actions", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liability_actions")
        .select("id, action_type, description, amount, created_at")
        .eq("liability_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as LiabilityActionRow[];
    },
  });
}

export interface NewMatter {
  liability_id: string;
  client_service_id: string;
  team_id: string;
  staff_id: string;
  case_number?: string | null;
  court_name?: string | null;
  county?: string | null;
  state?: string | null;
  opposing_party?: string | null;
  opposing_counsel?: string | null;
  opposing_creditor_id?: string | null;
  service_date?: string | null;
  response_deadline?: string | null;
}

/** Create a litigation matter from a debt. Returns the new matter id for navigation. */
export function useAddMatter(): UseMutationResult<string, Error, NewMatter> {
  const qc = useQueryClient();
  return useMutation<string, Error, NewMatter>({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from("litigation_matters")
        .insert({
          liability_id: input.liability_id,
          client_service_id: input.client_service_id,
          team_id: input.team_id,
          staff_id: input.staff_id,
          case_number: input.case_number || null,
          court_name: input.court_name || null,
          county: input.county || null,
          state: input.state || null,
          opposing_party: input.opposing_party || null,
          opposing_counsel: input.opposing_counsel || null,
          opposing_creditor_id: input.opposing_creditor_id || null,
          service_date: input.service_date || null,
          response_deadline: input.response_deadline || null,
          status: "new",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["litigation_matters"] });
    },
  });
}

/** Convenience: the current user's staff id, for default matter assignment. */
export function useMyStaffId(): string | undefined {
  return useAuth().staff?.id;
}
