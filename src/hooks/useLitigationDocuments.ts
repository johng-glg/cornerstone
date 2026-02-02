import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LitigationDocument {
  id: string;
  matter_id: string;
  document_type: string;
  title: string;
  file_url: string | null;
  filed_date: string | null;
  deadline_date: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  uploader?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export type LitigationDocumentInsert = Omit<LitigationDocument, 'id' | 'created_at' | 'uploader'>;
export type LitigationDocumentUpdate = Partial<LitigationDocumentInsert> & { id: string };

export function useLitigationDocuments(matterId: string | undefined) {
  return useQuery({
    queryKey: ['litigation_documents', matterId],
    queryFn: async () => {
      if (!matterId) return [];
      const { data, error } = await supabase
        .from('litigation_documents')
        .select(`
          *,
          uploader:staff!litigation_documents_uploaded_by_fkey(id, first_name, last_name)
        `)
        .eq('matter_id', matterId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LitigationDocument[];
    },
    enabled: !!matterId,
  });
}

export function useCreateLitigationDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (doc: LitigationDocumentInsert) => {
      const { data, error } = await supabase
        .from('litigation_documents')
        .insert([doc])
        .select()
        .single();
      if (error) throw error;
      
      // Log activity for document upload
      await supabase.from('litigation_activities').insert([{
        matter_id: data.matter_id,
        activity_type: 'filing',
        description: `Document added: ${data.title} (${data.document_type.replace('_', ' ')})`,
        document_url: data.file_url,
        staff_id: doc.uploaded_by || null,
      }]);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['litigation_documents', data.matter_id] });
      queryClient.invalidateQueries({ queryKey: ['litigation_activities', data.matter_id] });
      toast({ title: 'Document added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add document', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLitigationDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LitigationDocumentUpdate) => {
      const { data, error } = await supabase
        .from('litigation_documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['litigation_documents', data.matter_id] });
      toast({ title: 'Document updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update document', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLitigationDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, matterId }: { id: string; matterId: string }) => {
      const { error } = await supabase
        .from('litigation_documents')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { matterId };
    },
    onSuccess: ({ matterId }) => {
      queryClient.invalidateQueries({ queryKey: ['litigation_documents', matterId] });
      toast({ title: 'Document deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete document', description: error.message, variant: 'destructive' });
    },
  });
}
