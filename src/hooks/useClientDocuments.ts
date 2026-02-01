import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClientDocument {
  id: string;
  client_id: string;
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

export interface CreateClientDocumentInput {
  client_id: string;
  document_type: string;
  title: string;
  file_url: string;
  notes?: string;
  uploaded_by?: string;
}

export interface UpdateClientDocumentInput {
  id: string;
  document_type?: string;
  title?: string;
  notes?: string;
}

export const DOCUMENT_TYPES = [
  { value: 'id_verification', label: 'ID Verification' },
  { value: 'contract', label: 'Contract' },
  { value: 'disclosure', label: 'Disclosure' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'financial', label: 'Financial Document' },
  { value: 'legal', label: 'Legal Document' },
  { value: 'other', label: 'Other' },
] as const;

export function useClientDocuments(clientId?: string) {
  return useQuery({
    queryKey: ['client-documents', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('client_documents')
        .select(`
          *,
          uploader:staff!client_documents_uploaded_by_fkey(first_name, last_name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ClientDocument[];
    },
    enabled: !!clientId,
  });
}

export function useCreateClientDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateClientDocumentInput) => {
      const { data, error } = await supabase
        .from('client_documents')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-documents', variables.client_id] });
      toast({ title: 'Document added successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add document',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateClientDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateClientDocumentInput) => {
      const { data, error } = await supabase
        .from('client_documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-documents', data.client_id] });
      toast({ title: 'Document updated successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update document',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteClientDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return clientId;
    },
    onSuccess: (clientId) => {
      queryClient.invalidateQueries({ queryKey: ['client-documents', clientId] });
      toast({ title: 'Document deleted successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete document',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}
