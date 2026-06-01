import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Row shapes (hand-authored projections; see db-types.ts rationale) ──────────
export interface NoteRow {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
}
export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}
export interface BudgetRow {
  id: string;
  lead_id: string;
  category: string; // 'income' | 'expense'
  label: string;
  amount: number;
}

export const leadTabKeys = {
  notes: (entityType: string, id: string) => ["notes", entityType, id] as const,
  tasks: (entityType: string, id: string) => ["tasks", entityType, id] as const,
  budget: (id: string) => ["lead_budget", id] as const,
};

// ── Notes (polymorphic public.notes) ──────────────────────────────────────────
export function useEntityNotes(
  entityType: string,
  entityId: string | undefined,
): UseQueryResult<NoteRow[], Error> {
  return useQuery({
    queryKey: leadTabKeys.notes(entityType, entityId ?? ""),
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, content, created_by, created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as NoteRow[];
    },
  });
}

/** Add a note to any entity. `created_by` must be the caller's staff id (RLS). */
export function useAddNote(
  entityType: string,
  entityId: string,
  staffId: string | undefined,
): UseMutationResult<void, Error, { content: string }> {
  const qc = useQueryClient();
  return useMutation<void, Error, { content: string }>({
    mutationFn: async ({ content }) => {
      if (!staffId) throw new Error("No staff profile — cannot add a note.");
      const { error } = await supabase
        .from("notes")
        .insert({ entity_type: entityType, entity_id: entityId, content, created_by: staffId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: leadTabKeys.notes(entityType, entityId) }),
  });
}

// ── Tasks (public.tasks linked via entity_type/entity_id) ──────────────────────
export function useEntityTasks(
  entityType: string,
  entityId: string | undefined,
): UseQueryResult<TaskRow[], Error> {
  return useQuery({
    queryKey: leadTabKeys.tasks(entityType, entityId ?? ""),
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id, title, description, task_type, priority, status, due_date, completed_at, created_at",
        )
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as TaskRow[];
    },
  });
}

export interface NewTaskInput {
  title: string;
  priority: string;
  due_date?: string | null;
}

export function useAddTask(
  entityType: string,
  entityId: string,
  companyId: string | undefined,
  staffId: string | undefined,
): UseMutationResult<void, Error, NewTaskInput> {
  const qc = useQueryClient();
  return useMutation<void, Error, NewTaskInput>({
    mutationFn: async (input) => {
      if (!companyId) throw new Error("No active company — cannot add a task.");
      const { error } = await supabase.from("tasks").insert({
        company_id: companyId,
        title: input.title,
        priority: input.priority,
        due_date: input.due_date || null,
        created_by: staffId ?? null,
        entity_type: entityType,
        entity_id: entityId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: leadTabKeys.tasks(entityType, entityId) }),
  });
}

/** Toggle a task between completed and pending. */
export function useToggleTask(
  entityType: string,
  entityId: string,
): UseMutationResult<void, Error, { id: string; completed: boolean }> {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; completed: boolean }>({
    mutationFn: async ({ id, completed }) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: completed ? "completed" : "pending",
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: leadTabKeys.tasks(entityType, entityId) }),
  });
}

// ── Budget (public.lead_budgets, category income|expense) ──────────────────────
export function useLeadBudget(leadId: string | undefined): UseQueryResult<BudgetRow[], Error> {
  return useQuery({
    queryKey: leadTabKeys.budget(leadId ?? ""),
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_budgets")
        .select("id, lead_id, category, label, amount")
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as BudgetRow[];
    },
  });
}

export function useAddBudgetLine(
  leadId: string,
): UseMutationResult<void, Error, { category: string; label: string; amount: number }> {
  const qc = useQueryClient();
  return useMutation<void, Error, { category: string; label: string; amount: number }>({
    mutationFn: async (input) => {
      const { error } = await supabase.from("lead_budgets").insert({ lead_id: leadId, ...input });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: leadTabKeys.budget(leadId) }),
  });
}

export function useDeleteBudgetLine(
  leadId: string,
): UseMutationResult<void, Error, { id: string }> {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from("lead_budgets").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: leadTabKeys.budget(leadId) }),
  });
}
