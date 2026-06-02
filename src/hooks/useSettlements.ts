import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SettlementRow {
  id: string;
  liability_id: string;
  offer_amount: number;
  offer_percentage: number | null;
  number_of_payments: number | null;
  status: string;
  offered_date: string | null;
  accepted_date: string | null;
  attorney_approved: boolean | null;
  notes: string | null;
}

export function useSettlements(liabilityIds: string[]): UseQueryResult<SettlementRow[], Error> {
  return useQuery({
    queryKey: ["settlements", liabilityIds.join(",")],
    enabled: liabilityIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settlements")
        .select(
          "id, liability_id, offer_amount, offer_percentage, number_of_payments, status, offered_date, accepted_date, attorney_approved, notes",
        )
        .in("liability_id", liabilityIds)
        .order("offered_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SettlementRow[];
    },
  });
}

export interface NewSettlement {
  liability_id: string;
  offer_amount: number;
  offer_percentage?: number | null;
  number_of_payments?: number | null;
  notes?: string | null;
}

export function useAddSettlement(): UseMutationResult<void, Error, NewSettlement> {
  const qc = useQueryClient();
  return useMutation<void, Error, NewSettlement>({
    mutationFn: async (input) => {
      const { error } = await supabase.from("settlements").insert({
        liability_id: input.liability_id,
        offer_amount: input.offer_amount,
        offer_percentage: input.offer_percentage ?? null,
        number_of_payments: input.number_of_payments ?? null,
        notes: input.notes ?? null,
        status: "offered",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settlements"] }),
  });
}
