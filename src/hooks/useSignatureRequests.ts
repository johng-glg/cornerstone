import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  SignatureRequest,
  SignatureSigner,
  SignatureEvent,
  CreateSignatureRequestData,
  SignatureRequestStatus,
  SignerStatus,
  DeliveryMethod,
  SigningMode,
} from '@/types/esign';

// Fetch all signature requests for an entity (lead or client)
export function useSignatureRequests(entityType: 'lead' | 'client', entityId: string) {
  return useQuery({
    queryKey: ['signature-requests', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signature_requests')
        .select(`
          *,
          signature_signers (*)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform to typed structure
      return (data || []).map((request) => ({
        ...request,
        status: request.status as SignatureRequestStatus,
        signing_mode: request.signing_mode as SigningMode,
        delivery_method: request.delivery_method as DeliveryMethod,
        signers: (request.signature_signers || []).map((signer: Record<string, unknown>) => ({
          ...signer,
          status: signer.status as SignerStatus,
        })) as SignatureSigner[],
      })) as SignatureRequest[];
    },
    enabled: !!entityId,
  });
}

// Fetch a single signature request with full details
export function useSignatureRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['signature-request', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('signature_requests')
        .select(`
          *,
          signature_signers (*),
          signature_events (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        status: data.status as SignatureRequestStatus,
        signing_mode: data.signing_mode as SigningMode,
        delivery_method: data.delivery_method as DeliveryMethod,
        signers: (data.signature_signers || []).map((signer: Record<string, unknown>) => ({
          ...signer,
          status: signer.status as SignerStatus,
        })) as SignatureSigner[],
        events: (data.signature_events || []) as SignatureEvent[],
      } as SignatureRequest;
    },
    enabled: !!id,
  });
}

// Create a new signature request (draft)
export function useCreateSignatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSignatureRequestData) => {
      // Get current user's staff record for company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id, company_id')
        .eq('user_id', user.id)
        .single();

      if (staffError) throw staffError;

      // Generate short token
      const shortToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

      // Create the signature request
      const { data: request, error: requestError } = await supabase
        .from('signature_requests')
        .insert({
          company_id: staff.company_id,
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          docuseal_template_id: data.docuseal_template_id,
          title: data.title,
          status: 'draft',
          signing_mode: data.signing_mode,
          delivery_method: data.delivery_method,
          language: data.language,
          expires_at: data.expires_at || null,
          short_token: shortToken,
          created_by: staff.id,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create the signers
      const signersToInsert = data.signers.map((signer) => ({
        request_id: request.id,
        signer_role: signer.signer_role,
        name: signer.name,
        email: signer.email,
        phone: signer.phone || null,
        order_index: signer.order_index,
        status: 'pending' as const,
      }));

      const { error: signersError } = await supabase
        .from('signature_signers')
        .insert(signersToInsert);

      if (signersError) throw signersError;

      return request;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['signature-requests', variables.entity_type, variables.entity_id],
      });
    },
  });
}

// Send a signature request (triggers docuseal-send edge function)
export function useSendSignatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signatureRequestId: string) => {
      const { data, error } = await supabase.functions.invoke('docuseal-send', {
        body: { signature_request_id: signatureRequestId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['signature-request'] });
    },
  });
}

// Cancel a signature request
export function useCancelSignatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signatureRequestId: string) => {
      const { error } = await supabase
        .from('signature_requests')
        .update({ status: 'canceled' })
        .eq('id', signatureRequestId);

      if (error) throw error;

      // Log the cancellation event
      await supabase.from('signature_events').insert({
        request_id: signatureRequestId,
        event_type: 'canceled',
        event_data: {},
        occurred_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['signature-request'] });
    },
  });
}

// Resend reminder for a signature request
export function useResendSignatureReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ signatureRequestId, signerId }: { signatureRequestId: string; signerId?: string }) => {
      // For now, just log the reminder event
      // In the future, this would trigger notifications
      await supabase.from('signature_events').insert({
        request_id: signatureRequestId,
        signer_id: signerId || null,
        event_type: 'reminder_sent',
        event_data: { manual: true },
        occurred_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-request'] });
    },
  });
}
