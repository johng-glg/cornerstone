import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Workflow automation rules (trigger → action) on public.workflow_rules.

export const WORKFLOW_ENTITIES = [
  "leads",
  "client_services",
  "liabilities",
  "litigation_matters",
  "tasks",
  "settlements",
];
export const WORKFLOW_TRIGGERS = [
  "status_changed",
  "field_updated",
  "record_created",
  "time_based",
  "manual",
];
export const WORKFLOW_ACTIONS = [
  "create_task",
  "send_notification",
  "update_field",
  "block_transition",
  "trigger_webhook",
  "auto_graduate",
];

export interface WorkflowRule {
  id: string;
  name: string;
  description: string | null;
  entity_type: string;
  trigger_type: string;
  actions: { type?: string }[];
  is_active: boolean;
  is_blocking: boolean;
  priority: number;
}

export function useWorkflowRules(): UseQueryResult<WorkflowRule[], Error> {
  const { staff } = useAuth();
  return useQuery({
    queryKey: ["workflow_rules", staff?.company_id],
    enabled: !!staff?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_rules")
        .select(
          "id, name, description, entity_type, trigger_type, actions, is_active, is_blocking, priority",
        )
        .eq("company_id", staff!.company_id)
        .order("priority", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as WorkflowRule[];
    },
  });
}

export interface WorkflowRuleInput {
  id?: string | null;
  name: string;
  description?: string | null;
  entity_type: string;
  trigger_type: string;
  action_type: string;
  is_active: boolean;
  is_blocking: boolean;
  priority: number;
}

export function useSaveWorkflowRule(): UseMutationResult<void, Error, WorkflowRuleInput> {
  const qc = useQueryClient();
  const { staff } = useAuth();
  return useMutation<void, Error, WorkflowRuleInput>({
    mutationFn: async (input) => {
      if (!staff?.company_id) throw new Error("No active company.");
      const payload = {
        company_id: staff.company_id,
        created_by: staff.id ?? null,
        name: input.name,
        description: input.description || null,
        entity_type: input.entity_type,
        trigger_type: input.trigger_type,
        actions: [{ type: input.action_type }],
        conditions: [],
        trigger_config: {},
        is_active: input.is_active,
        is_blocking: input.is_blocking,
        priority: input.priority,
      };
      const { error } = input.id
        ? await supabase.from("workflow_rules").update(payload).eq("id", input.id)
        : await supabase.from("workflow_rules").insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow_rules"] }),
  });
}

export function useToggleWorkflowRule(): UseMutationResult<
  void,
  Error,
  { id: string; is_active: boolean }
> {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; is_active: boolean }>({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase.from("workflow_rules").update({ is_active }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow_rules"] }),
  });
}
