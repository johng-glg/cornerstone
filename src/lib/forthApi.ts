import { supabase } from '@/integrations/supabase/client';

export interface ForthApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Create a draft in Forth Pay from a transaction
export async function createForthDraft(transactionId: string): Promise<ForthApiResponse<{ draft_id: string }>> {
  try {
    const { data, error } = await supabase.functions.invoke('forth-create-draft', {
      body: { transaction_id: transactionId },
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return {
      success: data?.success ?? false,
      data: data?.draft_id ? { draft_id: data.draft_id } : undefined,
      error: data?.error,
      message: data?.message,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// Cancel a draft in Forth Pay
export async function cancelForthDraft(transactionId: string): Promise<ForthApiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('forth-cancel-draft', {
      body: { transaction_id: transactionId },
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return {
      success: data?.success ?? false,
      error: data?.error,
      message: data?.message,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// Update a draft in Forth Pay (reschedule or change amount)
export async function updateForthDraft(
  transactionId: string,
  updates: { process_date?: string; amount?: number }
): Promise<ForthApiResponse<{ process_date: string; amount: number }>> {
  try {
    const { data, error } = await supabase.functions.invoke('forth-update-draft', {
      body: { transaction_id: transactionId, ...updates },
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return {
      success: data?.success ?? false,
      data: data?.updated,
      error: data?.error,
      message: data?.message,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// Sync client with Forth CRM (fetch or link)
export async function syncForthClient(
  clientId: string, 
  options?: { forth_crm_id?: string; action?: 'fetch' | 'link' | 'post_note'; note?: string }
): Promise<ForthApiResponse<{ forth_crm_id?: string; contact?: unknown }>> {
  try {
    const { data, error } = await supabase.functions.invoke('forth-sync-client', {
      body: { client_id: clientId, ...options },
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return {
      success: data?.success ?? false,
      data: { forth_crm_id: data?.forth_crm_id, contact: data?.contact },
      error: data?.error,
      message: data?.message,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// Link a client to a Forth CRM contact ID
export async function linkClientToForth(clientId: string, forthCrmId: string): Promise<ForthApiResponse> {
  return syncForthClient(clientId, { forth_crm_id: forthCrmId, action: 'link' });
}

// Post a note to client's Forth CRM record
export async function postForthNote(clientId: string, note: string): Promise<ForthApiResponse> {
  return syncForthClient(clientId, { action: 'post_note', note });
}

// Pause a client's drafts in Forth
export async function pauseForthClient(clientId: string): Promise<ForthApiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('forth-pause-resume', {
      body: { client_id: clientId, action: 'pause' },
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return {
      success: data?.success ?? false,
      error: data?.error,
      message: data?.message,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// Resume a client's drafts in Forth
export async function resumeForthClient(clientId: string): Promise<ForthApiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('forth-pause-resume', {
      body: { client_id: clientId, action: 'resume' },
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return {
      success: data?.success ?? false,
      error: data?.error,
      message: data?.message,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// Trigger a poll of all pending transactions
export async function pollForthTransactions(): Promise<ForthApiResponse<{ polled: number; updated: number; errors: number }>> {
  try {
    const { data, error } = await supabase.functions.invoke('forth-poll-transactions', {
      body: {},
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return {
      success: data?.success ?? false,
      data: { polled: data?.polled, updated: data?.updated, errors: data?.errors },
      error: data?.error,
      message: data?.message,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// Test authentication with Forth API
export async function testForthAuth(): Promise<ForthApiResponse<{ tokenPreview: string }>> {
  try {
    const { data, error } = await supabase.functions.invoke('forth-auth', {
      body: {},
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return {
      success: data?.success ?? false,
      data: { tokenPreview: data?.tokenPreview },
      error: data?.error,
      message: data?.message,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// Check if a transaction can be modified (not within 7-day lock window)
export function canModifyDraft(scheduledDate: string | null | undefined): boolean {
  if (!scheduledDate) return true;
  
  const scheduled = new Date(scheduledDate);
  const now = new Date();
  const diffDays = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  return diffDays > 7;
}
