import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LeadDocument {
  id: string;
  lead_id: string;
  document_type: string;
  title: string;
  file_url: string;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  uploader?: {
    first_name: string;
    last_name: string;
  } | null;
}

export const LEAD_DOCUMENT_TYPES = [
  { value: 'summons', label: 'Summons' },
  { value: 'credit_report', label: 'Credit Report' },
  { value: 'statement', label: 'Statement' },
  { value: 'pay_stub', label: 'Pay Stub' },
  { value: 'id', label: 'ID / Identification' },
  { value: 'other', label: 'Other' },
] as const;

export function useLeadDocuments(leadId?: string) {
  return useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('lead_documents')
        .select(`
          *,
          uploader:staff!lead_documents_uploaded_by_fkey(first_name, last_name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeadDocument[];
    },
    enabled: !!leadId,
  });
}

export function useCreateLeadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      lead_id: string;
      document_type: string;
      title: string;
      file_url: string;
      notes?: string;
      uploaded_by?: string;
    }) => {
      const { data, error } = await supabase
        .from('lead_documents')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-documents', variables.lead_id] });
      toast({ title: 'Document uploaded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to upload document', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLeadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, leadId }: { id: string; leadId: string }) => {
      const { error } = await supabase
        .from('lead_documents')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return leadId;
    },
    onSuccess: (leadId) => {
      queryClient.invalidateQueries({ queryKey: ['lead-documents', leadId] });
      toast({ title: 'Document deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete document', description: error.message, variant: 'destructive' });
    },
  });
}
