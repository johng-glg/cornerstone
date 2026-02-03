import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  createForthDraft,
  cancelForthDraft,
  updateForthDraft,
  syncForthClient,
  linkClientToForth,
  postForthNote,
  pauseForthClient,
  resumeForthClient,
  pollForthTransactions,
  testForthAuth,
  registerForthClient,
  type RegisterClientRequest,
} from '@/lib/forthApi';

// Push a transaction to Forth Pay as a draft
export function usePushToForth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const result = await createForthDraft(transactionId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to push draft to Forth');
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction'] });
      toast({
        title: 'Draft Created',
        description: data.message || 'Transaction pushed to Forth Pay successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Push Draft',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Cancel a draft in Forth Pay
export function useCancelForthDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const result = await cancelForthDraft(transactionId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel draft');
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction'] });
      toast({
        title: 'Draft Cancelled',
        description: data.message || 'Draft cancelled in Forth Pay',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Cancel Draft',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update a draft in Forth Pay (reschedule or change amount)
export function useUpdateForthDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      transactionId, 
      updates 
    }: { 
      transactionId: string; 
      updates: { process_date?: string; amount?: number } 
    }) => {
      const result = await updateForthDraft(transactionId, updates);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update draft');
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction'] });
      toast({
        title: 'Draft Updated',
        description: data.message || 'Draft updated in Forth Pay',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Update Draft',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Sync client with Forth CRM
export function useSyncForthClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      clientId, 
      options 
    }: { 
      clientId: string; 
      options?: { forth_crm_id?: string; action?: 'fetch' | 'link' | 'post_note'; note?: string } 
    }) => {
      const result = await syncForthClient(clientId, options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to sync client');
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
      toast({
        title: 'Client Synced',
        description: data.message || 'Client synced with Forth CRM',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Sync Client',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Link a client to Forth CRM
export function useLinkClientToForth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ clientId, forthCrmId }: { clientId: string; forthCrmId: string }) => {
      const result = await linkClientToForth(clientId, forthCrmId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to link client');
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
      toast({
        title: 'Client Linked',
        description: data.message || 'Client linked to Forth CRM',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Link Client',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Post a note to Forth CRM
export function usePostForthNote() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ clientId, note }: { clientId: string; note: string }) => {
      const result = await postForthNote(clientId, note);
      if (!result.success) {
        throw new Error(result.error || 'Failed to post note');
      }
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: 'Note Posted',
        description: data.message || 'Note posted to Forth CRM',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Post Note',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Pause a client in Forth
export function usePauseForthClient() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const result = await pauseForthClient(clientId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to pause client');
      }
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: 'Client Paused',
        description: data.message || 'Client drafts paused in Forth',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Pause Client',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Resume a client in Forth
export function useResumeForthClient() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const result = await resumeForthClient(clientId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to resume client');
      }
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: 'Client Resumed',
        description: data.message || 'Client drafts resumed in Forth',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Resume Client',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Poll pending transactions for status updates
export function usePollForthTransactions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const result = await pollForthTransactions();
      if (!result.success) {
        throw new Error(result.error || 'Failed to poll transactions');
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Poll Complete',
        description: `Polled ${data.data?.polled || 0} transactions, updated ${data.data?.updated || 0}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Poll Transactions',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Test Forth API authentication
export function useTestForthAuth() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const result = await testForthAuth();
      if (!result.success) {
        throw new Error(result.error || 'Failed to authenticate');
      }
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: 'Authentication Successful',
        description: data.message || 'Connected to Forth API',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Authentication Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Register a new client with Forth Pay
export function useRegisterForthClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: RegisterClientRequest) => {
      const result = await registerForthClient(request);
      if (!result.success) {
        throw new Error(result.error || 'Failed to register client with Forth');
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
      toast({
        title: 'Client Registered',
        description: data.message || `Client registered with Forth Pay (ID: ${data.data?.forth_crm_id})`,
      });
      if (data.warning) {
        toast({
          title: 'Warning',
          description: data.warning,
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Register Client',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
