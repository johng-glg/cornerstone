import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PERMISSION_MODULES = [
  "leads",
  "clients",
  "engagements",
  "liabilities",
  "litigation",
  "billing",
  "payments",
  "tasks",
  "creditors",
  "services",
  "companies",
  "staff",
  "reports",
  "settings",
  "integrations",
  "templates",
];

export interface RolePerm {
  module: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export function useRolePermissions(role: string): UseQueryResult<RolePerm[], Error> {
  return useQuery({
    queryKey: ["role_permissions", role],
    enabled: !!role,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("module, can_read, can_create, can_update, can_delete")
        .eq("role", role);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as RolePerm[];
    },
  });
}

export function useUpsertRolePermission(): UseMutationResult<
  void,
  Error,
  RolePerm & { role: string }
> {
  const qc = useQueryClient();
  return useMutation<void, Error, RolePerm & { role: string }>({
    mutationFn: async (p) => {
      const { error } = await supabase.from("role_permissions").upsert(
        {
          role: p.role,
          module: p.module,
          can_read: p.can_read,
          can_create: p.can_create,
          can_update: p.can_update,
          can_delete: p.can_delete,
        },
        { onConflict: "role,module" },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["role_permissions", vars.role] }),
  });
}
