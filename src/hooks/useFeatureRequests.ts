import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, Enums } from '@/integrations/supabase/types';

export type FeatureRequest = Tables<'feature_requests'>;

export function useFeatureRequests() {
  return useQuery({
    queryKey: ['feature-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FeatureRequest[];
    },
  });
}

interface CreateFeatureRequestInput {
  title: string;
  description: string;
  category: Enums<'feature_request_category'>;
  request_type: Enums<'feature_request_type'>;
  priority: Enums<'feature_request_priority'>;
  affected_module?: string;
}

export function useCreateFeatureRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateFeatureRequestInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get staff info for denormalized fields
      const { data: staff } = await supabase
        .from('staff')
        .select('first_name, last_name, department')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('feature_requests')
        .insert({
          ...input,
          submitted_by: user.id,
          staff_name: staff ? `${staff.first_name} ${staff.last_name}` : null,
          department: staff?.department || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      toast({ title: 'Feature request submitted', description: 'Your request has been added to the backlog.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error submitting request', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFeatureRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FeatureRequest> & { id: string }) => {
      // If status is changing, fetch the current request to get submitter and old status
      let previousRequest: FeatureRequest | null = null;
      if (updates.status) {
        const { data: existing } = await supabase
          .from('feature_requests')
          .select('*')
          .eq('id', id)
          .single();
        previousRequest = existing as FeatureRequest | null;
      }

      const { data, error } = await supabase
        .from('feature_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Send notification to the submitter if status changed
      if (
        updates.status &&
        previousRequest?.submitted_by &&
        previousRequest.status !== updates.status
      ) {
        const statusLabel = updates.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        await supabase.from('notifications').insert({
          user_id: previousRequest.submitted_by,
          type: 'system_alert' as any,
          title: `Feature request status updated to "${statusLabel}"`,
          message: `Your request "${previousRequest.title}" has been moved to ${statusLabel}.`,
          entity_type: 'feature_request',
          entity_id: id,
          link: '/feature-requests',
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
      toast({ title: 'Request updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating request', description: error.message, variant: 'destructive' });
    },
  });
}
