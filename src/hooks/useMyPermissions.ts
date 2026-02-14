import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface MyModulePermission {
  module: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export function useMyPermissions() {
  const { roles } = useAuth();

  return useQuery({
    queryKey: ['my-permissions', roles],
    queryFn: async () => {
      if (!roles.length) return [];

      const { data, error } = await supabase
        .from('role_permissions')
        .select('module, can_read, can_create, can_update, can_delete')
        .in('role', roles as any);

      if (error) throw error;

      // Merge permissions across multiple roles (most permissive wins)
      const merged = new Map<string, MyModulePermission>();
      (data || []).forEach((row: any) => {
        const existing = merged.get(row.module);
        if (existing) {
          existing.can_read = existing.can_read || row.can_read;
          existing.can_create = existing.can_create || row.can_create;
          existing.can_update = existing.can_update || row.can_update;
          existing.can_delete = existing.can_delete || row.can_delete;
        } else {
          merged.set(row.module, { ...row });
        }
      });

      return Array.from(merged.values());
    },
    enabled: roles.length > 0,
    staleTime: 5 * 60 * 1000, // cache 5 min
  });
}

/** Check if user can perform action on a module */
export function useCanAccess(module: string, action: 'can_read' | 'can_create' | 'can_update' | 'can_delete' = 'can_read') {
  const { data: permissions, isLoading } = useMyPermissions();
  const { isAdmin } = useAuth();

  if (isAdmin()) return { allowed: true, loading: false };
  if (isLoading || !permissions) return { allowed: false, loading: isLoading };

  const perm = permissions.find(p => p.module === module);
  return { allowed: perm?.[action] ?? false, loading: false };
}
