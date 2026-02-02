import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TemplateVersion } from '@/types/templates';

// Helper to parse row to TemplateVersion
const parseVersion = (row: Record<string, unknown>): TemplateVersion => ({
  id: row.id as string,
  template_id: row.template_id as string,
  version_number: row.version_number as number,
  content: row.content as string,
  content_html: row.content_html as string | null,
  subject: row.subject as string | null,
  created_by: row.created_by as string | null,
  created_at: row.created_at as string,
  change_notes: row.change_notes as string | null,
  creator: row.creator as TemplateVersion['creator'],
});

export function useTemplateVersions(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template-versions', templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from('template_versions')
        .select(`
          *,
          creator:staff!template_versions_created_by_fkey(first_name, last_name)
        `)
        .eq('template_id', templateId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(row => parseVersion(row as Record<string, unknown>));
    },
    enabled: !!templateId,
  });
}

export function useTemplateVersion(versionId: string | undefined) {
  return useQuery({
    queryKey: ['template-version', versionId],
    queryFn: async () => {
      if (!versionId) return null;

      const { data, error } = await supabase
        .from('template_versions')
        .select(`
          *,
          creator:staff!template_versions_created_by_fkey(first_name, last_name)
        `)
        .eq('id', versionId)
        .single();

      if (error) throw error;
      return parseVersion(data as Record<string, unknown>);
    },
    enabled: !!versionId,
  });
}
