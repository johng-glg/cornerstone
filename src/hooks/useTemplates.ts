import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import type { 
  Template, 
  TemplateInsert, 
  TemplateUpdate, 
  TemplateType,
  MergeFieldDefinition,
  ConditionalClause
} from '@/types/templates';
import type { Json } from '@/integrations/supabase/types';

// Helper to convert Json to proper types
const parseTemplate = (row: Record<string, unknown>): Template => ({
  id: row.id as string,
  company_id: row.company_id as string,
  name: row.name as string,
  description: row.description as string | null,
  category_id: row.category_id as string | null,
  template_type: row.template_type as TemplateType,
  subject: row.subject as string | null,
  content: row.content as string,
  content_html: row.content_html as string | null,
  merge_fields: (row.merge_fields || []) as MergeFieldDefinition[],
  conditional_clauses: (row.conditional_clauses || []) as ConditionalClause[],
  is_active: row.is_active as boolean,
  is_system: row.is_system as boolean,
  language: row.language as 'en' | 'es',
  created_by: row.created_by as string | null,
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
  current_version: row.current_version as number,
  category: row.category as Template['category'],
  creator: row.creator as Template['creator'],
});

export function useTemplates(filters?: {
  type?: TemplateType;
  categoryId?: string;
  isActive?: boolean;
  search?: string;
}) {
  const { staff } = useAuth();

  return useQuery({
    queryKey: ['templates', staff?.company_id, filters],
    queryFn: async () => {
      if (!staff?.company_id) return [];

      let query = supabase
        .from('templates')
        .select(`
          *,
          category:template_categories(*),
          creator:staff!templates_created_by_fkey(first_name, last_name)
        `)
        .eq('company_id', staff.company_id)
        .order('name');

      if (filters?.type) {
        query = query.eq('template_type', filters.type);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(row => parseTemplate(row as Record<string, unknown>));
    },
    enabled: !!staff?.company_id,
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['template', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('templates')
        .select(`
          *,
          category:template_categories(*),
          creator:staff!templates_created_by_fkey(first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return parseTemplate(data as Record<string, unknown>);
    },
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (template: Omit<TemplateInsert, 'company_id' | 'created_by'>) => {
      if (!staff?.company_id || !staff?.id) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('templates')
        .insert({
          ...template,
          company_id: staff.company_id,
          created_by: staff.id,
          merge_fields: template.merge_fields as unknown as Json,
          conditional_clauses: template.conditional_clauses as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial version
      await supabase
        .from('template_versions')
        .insert({
          template_id: data.id,
          version_number: 1,
          content: template.content,
          content_html: template.content_html,
          subject: template.subject,
          created_by: staff.id,
          change_notes: 'Initial version',
        });

      return parseTemplate(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: 'Template created successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to create template', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, changeNotes, ...updates }: TemplateUpdate & { changeNotes?: string }) => {
      // Get current template to check version
      const { data: current, error: fetchError } = await supabase
        .from('templates')
        .select('current_version, content, content_html, subject')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newVersion = (current?.current_version || 0) + 1;

      const { data, error } = await supabase
        .from('templates')
        .update({
          ...updates,
          current_version: newVersion,
          merge_fields: updates.merge_fields as unknown as Json,
          conditional_clauses: updates.conditional_clauses as unknown as Json,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Create version record if content changed
      if (updates.content !== undefined || updates.content_html !== undefined || updates.subject !== undefined) {
        await supabase
          .from('template_versions')
          .insert({
            template_id: id,
            version_number: newVersion,
            content: updates.content ?? current?.content ?? '',
            content_html: updates.content_html ?? current?.content_html,
            subject: updates.subject ?? current?.subject,
            created_by: staff?.id,
            change_notes: changeNotes || null,
          });
      }

      return parseTemplate(data as Record<string, unknown>);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['template-versions'] });
      toast({ title: 'Template updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update template', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: 'Template deleted successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to delete template', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch original template
      const { data: original, error: fetchError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate
      const { data, error } = await supabase
        .from('templates')
        .insert({
          company_id: original.company_id,
          name: `${original.name} (Copy)`,
          description: original.description,
          category_id: original.category_id,
          template_type: original.template_type,
          subject: original.subject,
          content: original.content,
          content_html: original.content_html,
          merge_fields: original.merge_fields,
          conditional_clauses: original.conditional_clauses,
          is_active: false, // Duplicates start inactive
          is_system: false,
          language: original.language,
          created_by: staff?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial version for duplicate
      await supabase
        .from('template_versions')
        .insert({
          template_id: data.id,
          version_number: 1,
          content: original.content,
          content_html: original.content_html,
          subject: original.subject,
          created_by: staff?.id,
          change_notes: `Duplicated from template "${original.name}"`,
        });

      return parseTemplate(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: 'Template duplicated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to duplicate template', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}
