import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RolePermissionRow {
  id: string;
  role: string;
  module: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleSpecialPermissionRow {
  id: string;
  role: string;
  permission: string;
  created_at: string;
}

export function useRolePermissions() {
  return useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role')
        .order('module');
      if (error) throw error;
      return data as RolePermissionRow[];
    },
  });
}

export function useRoleSpecialPermissions() {
  return useQuery({
    queryKey: ['role-special-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_special_permissions')
        .select('*')
        .order('role')
        .order('permission');
      if (error) throw error;
      return data as RoleSpecialPermissionRow[];
    },
  });
}

export function useUpsertRolePermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      role: string;
      module: string;
      can_read: boolean;
      can_create: boolean;
      can_update: boolean;
      can_delete: boolean;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('role_permissions')
        .upsert(
          {
            role: input.role as any,
            module: input.module,
            can_read: input.can_read,
            can_create: input.can_create,
            can_update: input.can_update,
            can_delete: input.can_delete,
            notes: input.notes ?? null,
          },
          { onConflict: 'role,module' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
    },
    onError: (error) => {
      toast({ title: 'Failed to update permission', description: (error as Error).message, variant: 'destructive' });
    },
  });
}

export function useAddSpecialPermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { role: string; permission: string }) => {
      const { data, error } = await supabase
        .from('role_special_permissions')
        .insert({ role: input.role as any, permission: input.permission })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-special-permissions'] });
      toast({ title: 'Permission added' });
    },
    onError: (error) => {
      toast({ title: 'Failed to add permission', description: (error as Error).message, variant: 'destructive' });
    },
  });
}

export function useDeleteSpecialPermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('role_special_permissions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-special-permissions'] });
      toast({ title: 'Permission removed' });
    },
    onError: (error) => {
      toast({ title: 'Failed to remove permission', description: (error as Error).message, variant: 'destructive' });
    },
  });
}

// Role members (user_roles table)
export interface RoleMember {
  id: string;
  user_id: string;
  role: string;
  staff_first_name?: string;
  staff_last_name?: string;
  staff_email?: string;
  staff_job_title?: string | null;
}

export function useRoleMembers(role: string) {
  return useQuery({
    queryKey: ['role-members', role],
    queryFn: async () => {
      // Get user_roles for this role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('id, user_id, role')
        .eq('role', role as any);
      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) return [];

      // Get staff info for these users
      const userIds = roleData.map((r: any) => r.user_id);
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('user_id, first_name, last_name, email, job_title')
        .in('user_id', userIds);
      if (staffError) throw staffError;

      const staffMap = new Map((staffData || []).map((s: any) => [s.user_id, s]));

      return roleData.map((r: any) => {
        const s = staffMap.get(r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          role: r.role,
          staff_first_name: s?.first_name,
          staff_last_name: s?.last_name,
          staff_email: s?.email,
          staff_job_title: s?.job_title,
        } as RoleMember;
      });
    },
    enabled: !!role,
  });
}

export function useAddRoleMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { user_id: string; role: string }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: input.user_id, role: input.role as any })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['role-members', vars.role] });
      queryClient.invalidateQueries({ queryKey: ['role-members-count'] });
      toast({ title: 'Member assigned to role' });
    },
    onError: (error) => {
      toast({ title: 'Failed to assign member', description: (error as Error).message, variant: 'destructive' });
    },
  });
}

export function useRemoveRoleMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { id: string; role: string }) => {
      const { error } = await supabase.from('user_roles').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['role-members', vars.role] });
      queryClient.invalidateQueries({ queryKey: ['role-members-count'] });
      toast({ title: 'Member removed from role' });
    },
    onError: (error) => {
      toast({ title: 'Failed to remove member', description: (error as Error).message, variant: 'destructive' });
    },
  });
}

export function useRoleMemberCounts() {
  return useQuery({
    queryKey: ['role-members-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role');
      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        counts[r.role] = (counts[r.role] || 0) + 1;
      });
      return counts;
    },
  });
}
