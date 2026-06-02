import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Workflow automation rules (trigger → conditions → actions) on public.workflow_rules.

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
export const WORKFLOW_OPERATORS = ["eq", "neq", "gt", "gte", "lt", "lte", "contains", "in"];

/**
 * Status values per entity, used by the "When" step's from/to status-transition chips.
 * Sourced from the canonical enum mirror in src/lib/statuses.ts.
 */
export { STATUS_OPTIONS as ENTITY_STATUS_OPTIONS } from "@/lib/statuses";

/** Config fields each action type needs (key + label). auto_graduate has none. */
export const ACTION_FIELDS: Record<string, { key: string; label: string }[]> = {
  create_task: [
    { key: "title", label: "Task title" },
    { key: "priority", label: "Priority" },
  ],
  send_notification: [{ key: "message", label: "Message" }],
  update_field: [
    { key: "field", label: "Field" },
    { key: "value", label: "Value" },
  ],
  block_transition: [{ key: "reason", label: "Reason" }],
  trigger_webhook: [{ key: "url", label: "Webhook URL" }],
  auto_graduate: [],
};

export interface WfCondition {
  field: string;
  operator: string;
  value: string;
}
export interface WfAction {
  type: string;
  config: Record<string, string>;
}

/** Trigger-specific config. For status_changed rules, the from/to status-transition match. */
export interface WfTriggerConfig {
  from_status?: string[];
  to_status?: string[];
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string | null;
  entity_type: string;
  trigger_type: string;
  conditions: WfCondition[];
  actions: WfAction[];
  trigger_config: WfTriggerConfig;
  is_active: boolean;
  is_blocking: boolean;
  priority: number;
  group_id: string | null;
}

export interface WorkflowGroup {
  id: string;
  name: string;
  entity_type: string;
  color: string | null;
  description: string | null;
}

export function useWorkflowGroups(): UseQueryResult<WorkflowGroup[], Error> {
  const { staff } = useAuth();
  return useQuery({
    queryKey: ["workflow_groups", staff?.company_id],
    enabled: !!staff?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_groups")
        .select("id, name, entity_type, color, description")
        .eq("company_id", staff!.company_id)
        .order("priority", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as WorkflowGroup[];
    },
  });
}

export interface NewWorkflowGroup {
  name: string;
  entity_type: string;
  description?: string | null;
  color?: string | null;
}
export function useCreateWorkflowGroup(): UseMutationResult<void, Error, NewWorkflowGroup> {
  const qc = useQueryClient();
  const { staff } = useAuth();
  return useMutation<void, Error, NewWorkflowGroup>({
    mutationFn: async (input) => {
      if (!staff?.company_id) throw new Error("No active company.");
      const { error } = await supabase.from("workflow_groups").insert({
        company_id: staff.company_id,
        created_by: staff.id ?? null,
        name: input.name,
        entity_type: input.entity_type,
        description: input.description || null,
        color: input.color || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow_groups"] }),
  });
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
          "id, name, description, entity_type, trigger_type, conditions, actions, trigger_config, is_active, is_blocking, priority, group_id",
        )
        .eq("company_id", staff!.company_id)
        .order("priority", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        ...(r as Record<string, unknown>),
        conditions: Array.isArray((r as { conditions?: unknown }).conditions)
          ? (r as { conditions: WfCondition[] }).conditions
          : [],
        actions: Array.isArray((r as { actions?: unknown }).actions)
          ? (r as { actions: WfAction[] }).actions
          : [],
        trigger_config:
          (r as { trigger_config?: WfTriggerConfig }).trigger_config &&
          typeof (r as { trigger_config?: unknown }).trigger_config === "object"
            ? (r as { trigger_config: WfTriggerConfig }).trigger_config
            : {},
      })) as unknown as WorkflowRule[];
    },
  });
}

export interface WorkflowRuleInput {
  id?: string | null;
  name: string;
  description?: string | null;
  entity_type: string;
  trigger_type: string;
  conditions: WfCondition[];
  actions: WfAction[];
  trigger_config?: WfTriggerConfig;
  is_active: boolean;
  is_blocking: boolean;
  priority: number;
  group_id?: string | null;
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
        actions: input.actions,
        conditions: input.conditions,
        trigger_config: input.trigger_config ?? {},
        is_active: input.is_active,
        is_blocking: input.is_blocking,
        priority: input.priority,
        group_id: input.group_id ?? null,
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
