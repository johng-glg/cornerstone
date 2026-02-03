import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DocuSealTemplate, SignerRoleDefinition } from '@/types/esign';
import type { Json } from '@/integrations/supabase/types';

// Fetch all active DocuSeal templates for the current company
export function useDocuSealTemplates() {
  return useQuery({
    queryKey: ['docuseal-templates'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: staff } = await supabase
        .from('staff')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!staff) throw new Error('Staff record not found');

      const { data, error } = await supabase
        .from('docuseal_templates')
        .select('*')
        .eq('company_id', staff.company_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return (data || []).map((template) => ({
        ...template,
        signer_roles: (template.signer_roles as unknown as SignerRoleDefinition[]) || [],
      })) as DocuSealTemplate[];
    },
  });
}

// Fetch a single DocuSeal template
export function useDocuSealTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['docuseal-template', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('docuseal_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        signer_roles: (data.signer_roles as unknown as SignerRoleDefinition[]) || [],
      } as DocuSealTemplate;
    },
    enabled: !!id,
  });
}

// Create a new DocuSeal template mapping
export function useCreateDocuSealTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      docuseal_template_id: number;
      description?: string;
      signer_roles: SignerRoleDefinition[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: staff } = await supabase
        .from('staff')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!staff) throw new Error('Staff record not found');

      const { data: template, error } = await supabase
        .from('docuseal_templates')
        .insert([{
          company_id: staff.company_id,
          name: data.name,
          docuseal_template_id: data.docuseal_template_id,
          description: data.description || null,
          signer_roles: JSON.parse(JSON.stringify(data.signer_roles)) as Json,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docuseal-templates'] });
    },
  });
}

// Update a DocuSeal template
export function useUpdateDocuSealTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      name?: string;
      description?: string;
      signer_roles?: SignerRoleDefinition[];
      is_active?: boolean;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.signer_roles !== undefined) updateData.signer_roles = data.signer_roles;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      const { error } = await supabase
        .from('docuseal_templates')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docuseal-templates'] });
      queryClient.invalidateQueries({ queryKey: ['docuseal-template'] });
    },
  });
}

// Delete a DocuSeal template (soft delete by setting is_active = false)
export function useDeleteDocuSealTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('docuseal_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docuseal-templates'] });
    },
  });
}
