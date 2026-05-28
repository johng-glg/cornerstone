import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

/**
 * Registry of known tenant feature flags. Keep in sync with the SQL
 * fallback in `public.is_feature_enabled(...)`.
 */
export const FEATURE_FLAG_REGISTRY: Array<{
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}> = [
  {
    key: 'leads.paralegal_visibility',
    label: 'Paralegals can access the Lead Pipeline',
    description:
      'When ON, users whose only role is "paralegal" can view and manage leads. When OFF, leads are hidden from paralegals at the database level.',
    defaultEnabled: false,
  },
  {
    key: 'leads.show_in_navigation',
    label: 'Show Leads in the sidebar',
    description: 'Hide the Leads + Lead Metrics nav items entirely for this tenant.',
    defaultEnabled: true,
  },
];

export type TenantFeatureFlag = {
  id: string;
  company_id: string;
  flag_key: string;
  enabled: boolean;
  value: Record<string, unknown>;
  description: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useTenantFeatureFlags(companyId?: string | null) {
  const { staff } = useAuth();
  const effectiveCompanyId = companyId ?? staff?.company_id ?? null;

  return useQuery({
    queryKey: ['tenant-feature-flags', effectiveCompanyId],
    enabled: !!effectiveCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_feature_flags')
        .select('*')
        .eq('company_id', effectiveCompanyId!);
      if (error) throw error;
      return (data ?? []) as TenantFeatureFlag[];
    },
  });
}

/**
 * Returns whether a single flag is enabled for the current user's company,
 * resolving against the registry default when no row exists yet.
 */
export function useFeatureFlag(flagKey: string): boolean {
  const { data } = useTenantFeatureFlags();
  const row = data?.find((f) => f.flag_key === flagKey);
  if (row) return row.enabled;
  const fallback = FEATURE_FLAG_REGISTRY.find((f) => f.key === flagKey);
  return fallback?.defaultEnabled ?? false;
}

export function useSetFeatureFlag() {
  const qc = useQueryClient();
  const { staff } = useAuth();
  return useMutation({
    mutationFn: async ({
      flagKey,
      enabled,
      description,
    }: {
      flagKey: string;
      enabled: boolean;
      description?: string;
    }) => {
      if (!staff?.company_id) throw new Error('Missing company');
      const { error } = await supabase
        .from('tenant_feature_flags')
        .upsert(
          {
            company_id: staff.company_id,
            flag_key: flagKey,
            enabled,
            description: description ?? null,
            updated_by: staff.user_id,
          },
          { onConflict: 'company_id,flag_key' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-feature-flags'] });
      toast.success('Feature flag updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
