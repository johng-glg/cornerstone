import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { TERMS } from '@/lib/terminology';

/**
 * Phase 9B — tenant-aware terminology.
 *
 * Wraps the static `TERMS` constants in a per-company resolver that reads
 * `terminology_presets` keyed by `companies.company_type`, with optional
 * per-tenant overrides via `tenant_feature_flags`.
 *
 * Falls back to the existing `TERMS.*` constants when nothing is loaded yet so
 * callers can render synchronously without "loading" placeholders everywhere.
 */
export type TerminologyKey =
  | 'practice_area'
  | 'engagement'
  | 'engagements'
  | 'new_engagement'
  | 'plsa'
  | 'plsa_balance'
  | 'plsa_long'
  | 'liability'
  | 'liabilities'
  | 'matter'
  | 'attorney_role'
  | 'case_manager_role'
  | 'negotiator_role';

const FALLBACK: Record<TerminologyKey, string> = {
  practice_area: TERMS.consumerDebtDefense,
  engagement: TERMS.engagement,
  engagements: TERMS.engagements,
  new_engagement: TERMS.newEngagement,
  plsa: TERMS.plsa,
  plsa_balance: TERMS.plsaBalance,
  plsa_long: TERMS.plsaLong,
  liability: 'Liability',
  liabilities: 'Liabilities',
  matter: 'Matter',
  attorney_role: 'Attorney',
  case_manager_role: 'Case Manager',
  negotiator_role: 'Negotiator',
};

export function useTerminology(companyId?: string | null) {
  const { staff } = useAuth();
  const effectiveCompanyId = companyId ?? staff?.company_id ?? null;

  const { data } = useQuery({
    queryKey: ['terminology', effectiveCompanyId],
    enabled: !!effectiveCompanyId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_company_terminology', {
        _company_id: effectiveCompanyId!,
      });
      if (error) throw error;
      return (data ?? {}) as Record<string, string>;
    },
  });

  const t = (key: TerminologyKey): string => {
    return (data?.[key] as string | undefined) ?? FALLBACK[key];
  };

  return { t, labels: data ?? FALLBACK };
}
