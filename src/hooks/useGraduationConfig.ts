import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

export interface GraduationConfig {
  id: string;
  company_id: string;
  enabled: boolean;
  require_all_liabilities_resolved: boolean;
  fire_contact_close: boolean;
  notification_template_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useGraduationConfig() {
  const { staff } = useAuth();
  return useQuery({
    queryKey: ['graduation-config', staff?.company_id],
    enabled: Boolean(staff?.company_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('graduation_automation_config' as any)
        .select('*')
        .eq('company_id', staff!.company_id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as GraduationConfig | null);
    },
  });
}

export function useUpsertGraduationConfig() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { staff } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<GraduationConfig>) => {
      if (!staff?.company_id) throw new Error('Missing company');
      const { data, error } = await supabase
        .from('graduation_automation_config' as any)
        .upsert({ company_id: staff.company_id, ...input }, { onConflict: 'company_id' })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as GraduationConfig;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['graduation-config'] });
      toast({ title: 'Graduation settings saved' });
    },
    onError: (e: Error) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });
}

export function useGraduationEvents(serviceId?: string | null) {
  return useQuery({
    queryKey: ['graduation-events', serviceId],
    enabled: Boolean(serviceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('graduation_events' as any)
        .select('*')
        .eq('client_service_id', serviceId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
