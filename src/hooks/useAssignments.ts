import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Manual staff assignments (polymorphic public.assignments) + litigation team membership.

export const ASSIGNMENT_TYPES = [
  "primary_attorney",
  "litigation_attorney",
  "client_services_rep",
  "case_manager",
  "negotiator",
  "sales_rep",
];

export interface AssignmentRow {
  id: string;
  assignment_type: string;
  is_active: boolean;
  staff: { first_name: string; last_name: string } | null;
}

export function useAssignments(
  entityType: string,
  entityId: string | undefined,
): UseQueryResult<AssignmentRow[], Error> {
  return useQuery({
    queryKey: ["assignments", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("id, assignment_type, is_active, staff:staff_id(first_name, last_name)")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .eq("is_active", true)
        .order("assigned_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AssignmentRow[];
    },
  });
}

export function useAddAssignment(
  entityType: string,
  entityId: string,
): UseMutationResult<void, Error, { staff_id: string; assignment_type: string }> {
  const qc = useQueryClient();
  return useMutation<void, Error, { staff_id: string; assignment_type: string }>({
    mutationFn: async (input) => {
      const { error } = await supabase.from("assignments").insert({
        entity_type: entityType,
        entity_id: entityId,
        staff_id: input.staff_id,
        assignment_type: input.assignment_type,
        is_active: true,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments", entityType, entityId] }),
  });
}

export function useRemoveAssignment(
  entityType: string,
  entityId: string,
): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("assignments")
        .update({ is_active: false, unassigned_date: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments", entityType, entityId] }),
  });
}

// ── Litigation team membership ────────────────────────────────────────────────

export interface TeamMemberRow {
  id: string;
  staff_id: string;
  staff: { first_name: string; last_name: string } | null;
}

export function useTeamMembers(teamId: string | undefined): UseQueryResult<TeamMemberRow[], Error> {
  return useQuery({
    queryKey: ["team_members", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("litigation_team_members")
        .select("id, staff_id, staff:staff_id(first_name, last_name)")
        .eq("team_id", teamId!)
        .order("assigned_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as TeamMemberRow[];
    },
  });
}

export function useAddTeamMember(
  teamId: string,
): UseMutationResult<void, Error, { staff_id: string }> {
  const qc = useQueryClient();
  return useMutation<void, Error, { staff_id: string }>({
    mutationFn: async ({ staff_id }) => {
      const { error } = await supabase
        .from("litigation_team_members")
        .insert({ team_id: teamId, staff_id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team_members", teamId] }),
  });
}

export function useRemoveTeamMember(teamId: string): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.from("litigation_team_members").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team_members", teamId] }),
  });
}
