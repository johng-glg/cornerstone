import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AssignmentLogEntry, AssignLeadResult } from '@/types/assignment';

// Get assignment history for a lead
export function useAssignmentLog(leadId: string | undefined) {
  return useQuery({
    queryKey: ['assignment_log', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('lead_assignment_log')
        .select(`
          *,
          from_staff:staff!lead_assignment_log_from_staff_id_fkey (first_name, last_name),
          to_staff:staff!lead_assignment_log_to_staff_id_fkey (first_name, last_name),
          performed_by_staff:staff!lead_assignment_log_performed_by_fkey (first_name, last_name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as AssignmentLogEntry[];
    },
    enabled: !!leadId,
  });
}

interface AssignLeadInput {
  leadId: string;
  staffId?: string;
  reason?: string;
}

// Manually assign a lead
export function useAssignLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leadId, staffId }: AssignLeadInput) => {
      const { data, error } = await supabase.rpc('assign_lead', {
        _lead_id: leadId,
        _force_staff_id: staffId || null,
        _force_method: null,
      });
      
      if (error) throw error;
      
      // The RPC returns an array with one row
      const result = Array.isArray(data) ? data[0] : data;
      return result as AssignLeadResult;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['assignment_log', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['assignment_queue'] });
      queryClient.invalidateQueries({ queryKey: ['assignment_queue_count'] });
      
      if (result.assigned_to) {
        toast({ title: 'Lead assigned successfully' });
      } else {
        toast({ 
          title: 'Lead added to queue',
          description: result.reason,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to assign lead',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

interface ReassignLeadInput {
  leadId: string;
  fromStaffId: string | null;
  toStaffId: string;
  reason: string;
  performedBy: string;
}

// Reassign a lead with reason logging
export function useReassignLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leadId, fromStaffId, toStaffId, reason, performedBy }: ReassignLeadInput) => {
      // Update the lead
      const { error: updateError } = await supabase
        .from('leads')
        .update({ assigned_to: toStaffId })
        .eq('id', leadId);
      
      if (updateError) throw updateError;
      
      // Log the reassignment
      const { error: logError } = await supabase
        .from('lead_assignment_log')
        .insert([{
          lead_id: leadId,
          action: 'reassigned',
          from_staff_id: fromStaffId,
          to_staff_id: toStaffId,
          performed_by: performedBy,
          reason,
        }]);
      
      if (logError) throw logError;
      
      return { leadId, toStaffId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['assignment_log', variables.leadId] });
      toast({ title: 'Lead reassigned successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to reassign lead',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

// Unassign a lead
export function useUnassignLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leadId, fromStaffId, performedBy, reason }: { 
      leadId: string; 
      fromStaffId: string; 
      performedBy: string;
      reason?: string;
    }) => {
      // Update the lead
      const { error: updateError } = await supabase
        .from('leads')
        .update({ assigned_to: null })
        .eq('id', leadId);
      
      if (updateError) throw updateError;
      
      // Log the unassignment
      const { error: logError } = await supabase
        .from('lead_assignment_log')
        .insert([{
          lead_id: leadId,
          action: 'unassigned',
          from_staff_id: fromStaffId,
          to_staff_id: null,
          performed_by: performedBy,
          reason: reason || 'Manual unassignment',
        }]);
      
      if (logError) throw logError;
      
      return { leadId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['assignment_log', variables.leadId] });
      toast({ title: 'Lead unassigned' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to unassign lead',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}
