import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadSourceMetric {
  source: string;
  total_leads: number;
  contacted_count: number;
  credit_pull_count: number;
  qualified_count: number;
  converted_count: number;
  lost_count: number;
  contact_ratio: number;
  credit_pull_ratio: number;
  qualification_ratio: number;
  conversion_ratio: number;
}

export interface LeadRepMetric {
  staff_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  total_assigned: number;
  contacted_count: number;
  credit_pull_count: number;
  qualified_count: number;
  converted_count: number;
  lost_count: number;
  contact_ratio: number;
  conversion_ratio: number;
  avg_hours_to_contact: number | null;
  avg_days_to_convert: number | null;
}

export function useLeadSourceMetrics() {
  return useQuery({
    queryKey: ['lead_source_metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_source_metrics' as any)
        .select('*');
      if (error) throw error;
      return (data || []) as unknown as LeadSourceMetric[];
    },
  });
}

export function useLeadRepMetrics() {
  return useQuery({
    queryKey: ['lead_rep_metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_rep_metrics' as any)
        .select('*')
        .order('total_assigned', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LeadRepMetric[];
    },
  });
}

export function useLeadMetricsSummary() {
  const sourceMetrics = useLeadSourceMetrics();
  const repMetrics = useLeadRepMetrics();

  const summary = {
    totalLeads: 0,
    avgConversionRate: 0,
    bestSource: null as LeadSourceMetric | null,
    bestRep: null as LeadRepMetric | null,
  };

  if (sourceMetrics.data) {
    summary.totalLeads = sourceMetrics.data.reduce((sum, s) => sum + s.total_leads, 0);
    const totalConversions = sourceMetrics.data.reduce((sum, s) => sum + s.converted_count, 0);
    summary.avgConversionRate = summary.totalLeads > 0 ? totalConversions / summary.totalLeads : 0;
    summary.bestSource = sourceMetrics.data.reduce((best, curr) => 
      (!best || curr.conversion_ratio > best.conversion_ratio) ? curr : best, null as LeadSourceMetric | null);
  }

  if (repMetrics.data && repMetrics.data.length > 0) {
    summary.bestRep = repMetrics.data.reduce((best, curr) => 
      (!best || curr.conversion_ratio > best.conversion_ratio) ? curr : best, null as LeadRepMetric | null);
  }

  return {
    ...summary,
    isLoading: sourceMetrics.isLoading || repMetrics.isLoading,
    sourceMetrics: sourceMetrics.data || [],
    repMetrics: repMetrics.data || [],
  };
}
