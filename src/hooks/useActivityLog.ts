import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Unified, append-only activity feed (public.activity_log). Records cross-cutting actions
// (assignment, settlement, status changes, …) that don't belong to a single domain table, and
// powers the reusable <ActivityFeed> on detail pages.

export interface ActivityRow {
  id: string;
  entity_type: string;
  entity_id: string;
  category: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  performed_by: string | null;
  staff: { first_name: string; last_name: string } | null;
}

export function useActivityLog(
  entityType: string,
  entityId: string | undefined,
): UseQueryResult<ActivityRow[], Error> {
  return useQuery({
    queryKey: ["activity_log", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select(
          "id, entity_type, entity_id, category, description, metadata, created_at, performed_by, staff:performed_by(first_name, last_name)",
        )
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ActivityRow[];
    },
  });
}

/**
 * Rolled-up feed for a client: events recorded directly against the client, plus child-record
 * events (a liability's assignments/settlements, etc.) stamped with this client_id.
 */
export function useClientActivity(
  clientId: string | undefined,
): UseQueryResult<ActivityRow[], Error> {
  return useQuery({
    queryKey: ["activity_log_client", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select(
          "id, entity_type, entity_id, category, description, metadata, created_at, performed_by, staff:performed_by(first_name, last_name)",
        )
        .or(`client_id.eq.${clientId},and(entity_type.eq.client,entity_id.eq.${clientId})`)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ActivityRow[];
    },
  });
}

export interface ActivityInput {
  entityType: string;
  entityId: string;
  category: string;
  description: string;
  clientId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Returns a `record(...)` function that appends to the activity log, stamping company_id and the
 * acting staff from the auth context. Best-effort: it resolves even on failure (and warns) so a
 * logging hiccup never breaks the primary action that triggered it. Invalidates the matching feed.
 */
export function useRecordActivity() {
  const qc = useQueryClient();
  const { staff } = useAuth();
  const mutation = useMutation<void, Error, ActivityInput>({
    mutationFn: async (input) => {
      if (!staff?.company_id) return; // not provisioned yet — nothing to scope the row to
      const { error } = await supabase.from("activity_log").insert({
        company_id: staff.company_id,
        entity_type: input.entityType,
        entity_id: input.entityId,
        client_id: input.clientId ?? null,
        category: input.category,
        description: input.description,
        metadata: input.metadata ?? {},
        performed_by: staff.id ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, input) =>
      qc.invalidateQueries({ queryKey: ["activity_log", input.entityType, input.entityId] }),
  });

  return async (input: ActivityInput): Promise<void> => {
    try {
      await mutation.mutateAsync(input);
    } catch (e) {
      console.warn("[activity_log] failed to record:", (e as Error).message);
    }
  };
}
