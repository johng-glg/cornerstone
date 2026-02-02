import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import type { 
  TemplateCategory, 
  TemplateCategoryInsert, 
  TemplateCategoryUpdate,
  TemplateType,
  DEFAULT_TEMPLATE_CATEGORIES
} from '@/types/templates';

// Helper to parse row to TemplateCategory
const parseCategory = (row: Record<string, unknown>): TemplateCategory => ({
  id: row.id as string,
  company_id: row.company_id as string,
  name: row.name as string,
  description: row.description as string | null,
  template_type: row.template_type as TemplateType | null,
  sort_order: row.sort_order as number,
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
});

export function useTemplateCategories(templateType?: TemplateType) {
  const { staff } = useAuth();

  return useQuery({
    queryKey: ['template-categories', staff?.company_id, templateType],
    queryFn: async () => {
      if (!staff?.company_id) return [];

      let query = supabase
        .from('template_categories')
        .select('*')
        .eq('company_id', staff.company_id)
        .order('sort_order');

      if (templateType) {
        // Include categories that match the type OR are generic (null type)
        query = query.or(`template_type.eq.${templateType},template_type.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(row => parseCategory(row as Record<string, unknown>));
    },
    enabled: !!staff?.company_id,
  });
}

export function useCreateTemplateCategory() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (category: Omit<TemplateCategoryInsert, 'company_id'>) => {
      if (!staff?.company_id) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('template_categories')
        .insert({
          ...category,
          company_id: staff.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      return parseCategory(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-categories'] });
      toast({ title: 'Category created successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to create category', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateTemplateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TemplateCategoryUpdate) => {
      const { data, error } = await supabase
        .from('template_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return parseCategory(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-categories'] });
      toast({ title: 'Category updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update category', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useDeleteTemplateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('template_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-categories'] });
      toast({ title: 'Category deleted successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to delete category', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useSeedDefaultCategories() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!staff?.company_id) {
        throw new Error('Not authenticated');
      }

      // Import default categories
      const { DEFAULT_TEMPLATE_CATEGORIES } = await import('@/types/templates');

      const categoriesToInsert = DEFAULT_TEMPLATE_CATEGORIES.map(cat => ({
        ...cat,
        company_id: staff.company_id,
      }));

      const { error } = await supabase
        .from('template_categories')
        .insert(categoriesToInsert);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-categories'] });
      toast({ title: 'Default categories created successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to create default categories', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}
