import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ReminderSettings, ReminderSettingsUpdate } from '@/types/reminders';

export function useReminderSettings() {
  return useQuery({
    queryKey: ['reminder_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_settings')
        .select('*')
        .single();
      
      if (error) {
        // If no settings exist, return null (we'll create defaults)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      return data as ReminderSettings;
    },
  });
}

export function useCreateReminderSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (companyId: string) => {
      const { data, error } = await supabase
        .from('reminder_settings')
        .insert({
          company_id: companyId,
          response_deadline_days: [7, 3, 1],
          hearing_days: [7, 3, 1, 0],
          task_due_days: [3, 1],
          reminder_hour: 9,
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder_settings'] });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to create reminder settings', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateReminderSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ReminderSettingsUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('reminder_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder_settings'] });
      toast({ title: 'Reminder settings updated' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to update settings', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}
