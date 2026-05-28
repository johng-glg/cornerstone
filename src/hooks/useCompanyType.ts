import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { Database } from '@/integrations/supabase/types';

export type CompanyType = Database['public']['Enums']['company_type_enum'];

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  law_firm: 'Law Firm',
  debt_relief: 'Debt Relief',
  debt_settlement: 'Debt Settlement',
  legal_plan: 'Legal Plan',
  hybrid: 'Hybrid',
  other: 'Other',
};

/** Returns the current user's company_type, defaulting to law_firm. */
export function useCompanyType(companyId?: string | null): CompanyType {
  const { staff } = useAuth();
  const effectiveCompanyId = companyId ?? staff?.company_id ?? null;

  const { data } = useQuery({
    queryKey: ['company-type', effectiveCompanyId],
    enabled: !!effectiveCompanyId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('company_type')
        .eq('id', effectiveCompanyId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.company_type ?? 'law_firm') as CompanyType;
    },
  });

  return data ?? 'law_firm';
}
