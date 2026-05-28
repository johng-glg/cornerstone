import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import type { CompanyType } from '@/hooks/useCompanyType';

/**
 * Registry of known tenant feature flags. Keep in sync with the SQL
 * fallback in `public.is_feature_enabled(...)`.
 *
 * `defaultByCompanyType` (Phase 9C) takes precedence over `defaultEnabled`
 * when a company_type is known and present in the map.
 */
export const FEATURE_FLAG_REGISTRY: Array<{
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
  defaultByCompanyType?: Partial<Record<CompanyType, boolean>>;
  category?: string;
}> = [
  {
    key: 'leads.paralegal_visibility',
    label: 'Paralegals can access the Lead Pipeline',
    description:
      'When ON, users whose only role is "paralegal" can view and manage leads. When OFF, leads are hidden from paralegals at the database level.',
    defaultEnabled: false,
    category: 'Roles',
  },
  {
    key: 'leads.show_in_navigation',
    label: 'Show Leads in the sidebar',
    description: 'Hide the Leads + Lead Metrics nav items entirely for this tenant.',
    defaultEnabled: true,
    category: 'Navigation',
  },
  // Phase 9C — module-visibility flags
  {
    key: 'litigation.module_visible',
    label: 'Litigation module',
    description: 'Full litigation case management module with matters, hearings, and court calendar.',
    defaultEnabled: true,
    defaultByCompanyType: {
      law_firm: true,
      legal_plan: true,
      hybrid: true,
      debt_relief: false,
      debt_settlement: false,
      other: false,
    },
    category: 'Modules',
  },
  {
    key: 'litigation.court_calendar_visible',
    label: 'Court calendar',
    description: 'Dedicated court calendar view under Litigation.',
    defaultEnabled: true,
    defaultByCompanyType: {
      law_firm: true,
      legal_plan: true,
      hybrid: true,
      debt_relief: false,
      debt_settlement: false,
      other: false,
    },
    category: 'Modules',
  },
  {
    key: 'litigation.teams_module_visible',
    label: 'Litigation teams',
    description: 'Attorney / Case Manager / Negotiator team assignment per matter.',
    defaultEnabled: true,
    defaultByCompanyType: {
      law_firm: true,
      legal_plan: true,
      hybrid: true,
      debt_relief: false,
      debt_settlement: false,
      other: false,
    },
    category: 'Modules',
  },
  {
    key: 'litigation.summons_alert_module_visible',
    label: 'Summons / lawsuit alerts',
    description:
      'Lightweight summons tracking. Surfaces a Lawsuit Alerts page and "Mark as Sued" on liabilities. Intended for non-law-firm tenants who refer cases out.',
    defaultEnabled: false,
    defaultByCompanyType: {
      law_firm: false,
      legal_plan: true,
      hybrid: true,
      debt_relief: true,
      debt_settlement: true,
      other: false,
    },
    category: 'Modules',
  },
  {
    key: 'roles.attorney_role_available',
    label: 'Attorney role available',
    description: 'When OFF, "Attorney" is hidden from role-assignment pickers for this tenant.',
    defaultEnabled: true,
    defaultByCompanyType: {
      law_firm: true,
      legal_plan: true,
      hybrid: true,
      debt_relief: false,
      debt_settlement: false,
      other: true,
    },
    category: 'Roles',
  },
  {
    key: 'billing.module_visible',
    label: 'Billing module',
    description: 'Hourly billing, time entries, and invoicing — typically only relevant for law firms.',
    defaultEnabled: true,
    defaultByCompanyType: {
      law_firm: true,
      legal_plan: false,
      hybrid: true,
      debt_relief: false,
      debt_settlement: false,
      other: false,
    },
    category: 'Modules',
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
 * Resolve a single flag for the current company. Precedence:
 *   1. Explicit `tenant_feature_flags` row.
 *   2. Registry `defaultByCompanyType` entry for the company_type (if known).
 *   3. Registry `defaultEnabled`.
 *   4. `false`.
 *
 * Pass `companyType` to make this synchronous against an already-known type.
 */
export function useFeatureFlag(flagKey: string, companyType?: string | null): boolean {
  const { data } = useTenantFeatureFlags();
  const row = data?.find((f) => f.flag_key === flagKey);
  if (row) return row.enabled;

  const fallback = FEATURE_FLAG_REGISTRY.find((f) => f.key === flagKey);
  if (!fallback) return false;

  if (companyType && fallback.defaultByCompanyType) {
    const byType = fallback.defaultByCompanyType[companyType as CompanyType];
    if (typeof byType === 'boolean') return byType;
  }

  return fallback.defaultEnabled;
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

      // Best-effort audit log; never block the mutation on this.
      try {
        await supabase.rpc('log_audit_event', {
          _action: 'feature_flag.changed',
          _entity_type: 'tenant_feature_flag',
          _entity_id: null,
          _company_id: staff.company_id,
          _request_payload: { flag_key: flagKey, enabled },
          _response_payload: null,
          _ip_address: null,
          _user_agent: null,
        });
      } catch (auditErr) {
        console.warn('Failed to log feature_flag audit event', auditErr);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-feature-flags'] });
      toast.success('Feature flag updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
