import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ScoringProfile, ScoringProfileInsert, ScoringProfileUpdate, ScoringCriteria } from '@/types/scoring';
import type { Json } from '@/integrations/supabase/types';

// Helper to safely parse criteria from database
function parseCriteria(criteria: Json): ScoringCriteria {
  if (typeof criteria === 'object' && criteria !== null && !Array.isArray(criteria)) {
    return criteria as unknown as ScoringCriteria;
  }
  return {};
}

// Helper to convert ScoringCriteria to Json for database
function criteriaToJson(criteria: ScoringCriteria): Json {
  return criteria as unknown as Json;
}

export function useScoringProfiles() {
  return useQuery({
    queryKey: ['scoring_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_scoring_profiles')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return data.map(profile => ({
        ...profile,
        criteria: parseCriteria(profile.criteria),
      })) as ScoringProfile[];
    },
  });
}

export function useScoringProfile(id: string | undefined) {
  return useQuery({
    queryKey: ['scoring_profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('lead_scoring_profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return {
        ...data,
        criteria: parseCriteria(data.criteria),
      } as ScoringProfile;
    },
    enabled: !!id,
  });
}

export function useCreateScoringProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (profile: ScoringProfileInsert) => {
      const { data, error } = await supabase
        .from('lead_scoring_profiles')
        .insert([{
          ...profile,
          criteria: criteriaToJson(profile.criteria),
        }])
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        criteria: parseCriteria(data.criteria),
      } as ScoringProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring_profiles'] });
      toast({ title: 'Scoring profile created successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to create scoring profile', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateScoringProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ScoringProfileUpdate & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.criteria) {
        updateData.criteria = criteriaToJson(updates.criteria);
      }
      
      const { data, error } = await supabase
        .from('lead_scoring_profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        criteria: parseCriteria(data.criteria),
      } as ScoringProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scoring_profiles'] });
      queryClient.invalidateQueries({ queryKey: ['scoring_profile', data.id] });
      toast({ title: 'Scoring profile updated successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to update scoring profile', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

export function useDeleteScoringProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lead_scoring_profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring_profiles'] });
      toast({ title: 'Scoring profile deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to delete scoring profile', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

export function useSetDefaultProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, unset current default
      const { error: unsetError } = await supabase
        .from('lead_scoring_profiles')
        .update({ is_default: false })
        .eq('is_default', true);
      if (unsetError) throw unsetError;

      // Set new default
      const { error: setError } = await supabase
        .from('lead_scoring_profiles')
        .update({ is_default: true })
        .eq('id', id);
      if (setError) throw setError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring_profiles'] });
      toast({ title: 'Default profile updated' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to set default profile', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}
