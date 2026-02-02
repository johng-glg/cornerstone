import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReportTemplate, ReportConfig } from '@/types/reports';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

// Helper to safely parse JSON config
function parseConfig(config: Json | null | undefined): ReportConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { columns: [], filters: [] };
  }
  return config as unknown as ReportConfig;
}

// Fetch all report templates (presets + user's company templates)
export function useReportTemplates() {
  return useQuery({
    queryKey: ['report-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .order('is_preset', { ascending: false })
        .order('name');
      
      if (error) throw error;
      
      // Parse JSON config for each template
      return (data || []).map(template => ({
        ...template,
        config: parseConfig(template.config),
      })) as ReportTemplate[];
    },
  });
}

// Fetch only preset reports
export function usePresetReports() {
  return useQuery({
    queryKey: ['report-templates', 'presets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('is_preset', true)
        .order('name');
      
      if (error) throw error;
      
      return (data || []).map(template => ({
        ...template,
        config: parseConfig(template.config),
      })) as ReportTemplate[];
    },
  });
}

// Fetch user's saved templates (non-preset)
export function useSavedReports() {
  return useQuery({
    queryKey: ['report-templates', 'saved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('is_preset', false)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(template => ({
        ...template,
        config: parseConfig(template.config),
      })) as ReportTemplate[];
    },
  });
}

// Save a new report template
export function useSaveReportTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      module,
      config,
      isPublic,
      companyId,
      createdBy,
    }: {
      name: string;
      description?: string;
      module: string;
      config: ReportConfig;
      isPublic: boolean;
      companyId: string;
      createdBy: string;
    }) => {
      const { data, error } = await supabase
        .from('report_templates')
        .insert([{
          name,
          description: description || null,
          module,
          config: config as unknown as Json,
          is_public: isPublic,
          is_preset: false,
          company_id: companyId,
          created_by: createdBy,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast({
        title: 'Report Saved',
        description: 'Your report template has been saved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to save report: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Update an existing report template
export function useUpdateReportTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      config,
      isPublic,
    }: {
      id: string;
      name?: string;
      description?: string;
      config?: ReportConfig;
      isPublic?: boolean;
    }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (config !== undefined) updates.config = config as unknown as Json;
      if (isPublic !== undefined) updates.is_public = isPublic;

      const { data, error } = await supabase
        .from('report_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast({
        title: 'Report Updated',
        description: 'Your report template has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update report: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Delete a report template
export function useDeleteReportTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('report_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast({
        title: 'Report Deleted',
        description: 'Your report template has been deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete report: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}
