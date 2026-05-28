import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TemplateUsageRow {
  id: string;
  template_id: string;
  entity_type: string;
  entity_id: string;
  used_by: string | null;
  used_at: string;
  channel: string | null;
  success: boolean;
  error_message: string | null;
  user?: { first_name: string; last_name: string } | null;
}

export function useTemplateUsage(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template-usage', templateId],
    queryFn: async (): Promise<TemplateUsageRow[]> => {
      if (!templateId) return [];
      const { data, error } = await supabase
        .from('template_usage')
        .select(`*, user:staff!template_usage_used_by_fkey(first_name, last_name)`)
        .eq('template_id', templateId)
        .order('used_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as TemplateUsageRow[];
    },
    enabled: !!templateId,
  });
}

export function useTemplateUsageStats(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template-usage-stats', templateId],
    queryFn: async () => {
      if (!templateId) return { total: 0, last30: 0, byChannel: {} as Record<string, number>, lastUsed: null as string | null };
      const { data, error } = await supabase
        .from('template_usage')
        .select('used_at, channel, success')
        .eq('template_id', templateId);
      if (error) throw error;
      const rows = (data || []) as Array<{ used_at: string; channel: string | null; success: boolean }>;
      const thirty = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const byChannel: Record<string, number> = {};
      let last30 = 0;
      let lastUsed: string | null = null;
      for (const r of rows) {
        const ch = r.channel || 'unknown';
        byChannel[ch] = (byChannel[ch] || 0) + 1;
        if (new Date(r.used_at).getTime() >= thirty) last30++;
        if (!lastUsed || new Date(r.used_at) > new Date(lastUsed)) lastUsed = r.used_at;
      }
      return { total: rows.length, last30, byChannel, lastUsed };
    },
    enabled: !!templateId,
  });
}
