import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Per-rule candidate pool for the lead-assignment engine (public.lead_assignment_pool).

export interface PoolMemberRow {
  id: string;
  staff_id: string;
  weight: number;
  max_active_leads: number | null;
  is_available: boolean;
  assignment_count: number;
  staff: { first_name: string; last_name: string } | null;
}

const key = (ruleId: string) => ["assignment_pool", ruleId];

export function useAssignmentPool(
  ruleId: string | undefined,
): UseQueryResult<PoolMemberRow[], Error> {
  return useQuery({
    queryKey: ["assignment_pool", ruleId],
    enabled: !!ruleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_assignment_pool")
        .select(
          "id, staff_id, weight, max_active_leads, is_available, assignment_count, staff:staff_id(first_name, last_name)",
        )
        .eq("rule_id", ruleId!)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PoolMemberRow[];
    },
  });
}

export interface NewPoolMember {
  staff_id: string;
  weight: number;
  max_active_leads: number | null;
}
export function useAddPoolMember(ruleId: string): UseMutationResult<void, Error, NewPoolMember> {
  const qc = useQueryClient();
  return useMutation<void, Error, NewPoolMember>({
    mutationFn: async (input) => {
      const { error } = await supabase.from("lead_assignment_pool").insert({
        rule_id: ruleId,
        staff_id: input.staff_id,
        weight: input.weight,
        max_active_leads: input.max_active_leads,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(ruleId) }),
  });
}

export function useRemovePoolMember(ruleId: string): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (memberId) => {
      const { error } = await supabase.from("lead_assignment_pool").delete().eq("id", memberId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(ruleId) }),
  });
}

export function useTogglePoolMember(
  ruleId: string,
): UseMutationResult<void, Error, { id: string; is_available: boolean }> {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; is_available: boolean }>({
    mutationFn: async ({ id, is_available }) => {
      const { error } = await supabase
        .from("lead_assignment_pool")
        .update({ is_available })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(ruleId) }),
  });
}
