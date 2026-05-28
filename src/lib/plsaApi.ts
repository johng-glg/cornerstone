// PLSA API — Phase 4C
// All Pre-Litigation Settlement Account operations route through the
// `plsa-routing` edge function, which dispatches to provider-specific
// edge functions based on `client_services.plsa_provider_id`.
//
// Public function signatures match the old forthApi.ts so call-sites in
// hooks/components don't need to change.

import { supabase } from '@/integrations/supabase/client';

export interface PlsaApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  warning?: string;
  provider_id?: string;
}

// Backwards-compat alias for code that still imports ForthApiResponse.
export type ForthApiResponse<T = unknown> = PlsaApiResponse<T>;

export interface RegisterClientData {
  first_name: string;
  last_name: string;
  middle_name?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
  date_of_birth: string;
  ssn?: string;
}

export interface RegisterBankingData {
  bank_name: string;
  routing_number: string;
  account_number: string;
  account_type: 'checking' | 'savings';
}

export interface RegisterDebtData {
  creditor_name: string;
  account_type: string;
  current_balance: number;
  original_balance?: number;
  account_number?: string;
}

export interface RegisterClientRequest {
  client_id: string;
  client_service_id: string;
  client_data: RegisterClientData;
  banking?: RegisterBankingData;
  debts: RegisterDebtData[];
}

// Core router invocation
type RouteRequest = {
  operation: string;
  client_id?: string;
  client_service_id?: string;
  transaction_id?: string;
  settlement_id?: string;
  payload?: Record<string, unknown>;
};

async function invokeRouting<T = unknown>(req: RouteRequest): Promise<PlsaApiResponse<T>> {
  try {
    const { data, error } = await supabase.functions.invoke('plsa-routing', { body: req });
    if (error) return { success: false, error: error.message };
    return {
      success: data?.success ?? false,
      data: data as T,
      error: data?.error,
      message: data?.message,
      warning: data?.warning,
      provider_id: data?.provider_id,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Drafts ─────────────────────────────────────────────────────────────────

export async function createForthDraft(
  transactionId: string,
): Promise<PlsaApiResponse<{ draft_id: string }>> {
  const res = await invokeRouting<{ draft_id?: string }>({ operation: 'create_draft', transaction_id: transactionId });
  return { ...res, data: res.data?.draft_id ? { draft_id: res.data.draft_id } : undefined };
}

export async function cancelForthDraft(transactionId: string): Promise<PlsaApiResponse> {
  return invokeRouting({ operation: 'cancel_draft', transaction_id: transactionId });
}

export async function updateForthDraft(
  transactionId: string,
  updates: { process_date?: string; amount?: number },
): Promise<PlsaApiResponse<{ process_date: string; amount: number }>> {
  const res = await invokeRouting<{ updated?: { process_date: string; amount: number } }>({
    operation: 'update_draft',
    transaction_id: transactionId,
    payload: updates,
  });
  return { ...res, data: res.data?.updated };
}

// ─── Client sync / contact ──────────────────────────────────────────────────

export async function syncForthClient(
  clientId: string,
  options?: { forth_crm_id?: string; action?: 'fetch' | 'link' | 'post_note'; note?: string },
): Promise<PlsaApiResponse<{ forth_crm_id?: string; contact?: unknown }>> {
  const res = await invokeRouting<{ forth_crm_id?: string; contact?: unknown }>({
    operation: 'sync_client',
    client_id: clientId,
    payload: options as Record<string, unknown> | undefined,
  });
  return {
    ...res,
    data: { forth_crm_id: res.data?.forth_crm_id, contact: res.data?.contact },
  };
}

export async function linkClientToForth(clientId: string, forthCrmId: string): Promise<PlsaApiResponse> {
  return syncForthClient(clientId, { forth_crm_id: forthCrmId, action: 'link' });
}

export async function postForthNote(clientId: string, note: string): Promise<PlsaApiResponse> {
  return syncForthClient(clientId, { action: 'post_note', note });
}

export async function pauseForthClient(clientId: string): Promise<PlsaApiResponse> {
  return invokeRouting({ operation: 'pause_resume', client_id: clientId, payload: { action: 'pause' } });
}

export async function resumeForthClient(clientId: string): Promise<PlsaApiResponse> {
  return invokeRouting({ operation: 'pause_resume', client_id: clientId, payload: { action: 'resume' } });
}

export async function pollForthTransactions(): Promise<PlsaApiResponse<{ polled: number; updated: number; errors: number }>> {
  const res = await invokeRouting<{ polled?: number; updated?: number; errors?: number }>({
    operation: 'poll_transactions',
  });
  return {
    ...res,
    data: { polled: res.data?.polled ?? 0, updated: res.data?.updated ?? 0, errors: res.data?.errors ?? 0 },
  };
}

export async function testForthAuth(): Promise<PlsaApiResponse<{ tokenPreview: string }>> {
  const res = await invokeRouting<{ tokenPreview?: string }>({ operation: 'auth_test' });
  return { ...res, data: { tokenPreview: res.data?.tokenPreview ?? '' } };
}

export function canModifyDraft(scheduledDate: string | null | undefined): boolean {
  if (!scheduledDate) return true;
  const scheduled = new Date(scheduledDate);
  const now = new Date();
  const diffDays = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 7;
}

export async function registerForthClient(
  request: RegisterClientRequest,
): Promise<PlsaApiResponse<{ forth_crm_id: string }>> {
  const res = await invokeRouting<{ forth_crm_id?: string }>({
    operation: 'register_client',
    client_id: request.client_id,
    client_service_id: request.client_service_id,
    payload: request as unknown as Record<string, unknown>,
  });
  return { ...res, data: res.data?.forth_crm_id ? { forth_crm_id: res.data.forth_crm_id } : undefined };
}

// ─── Phase 3 operations ─────────────────────────────────────────────────────

export interface ForthBalanceResult {
  balance: number;
  balance_cents: number;
  as_of_timestamp: string;
  source: 'forth' | 'mock' | string;
  local_projection: number;
  drift_detected: boolean;
}

export async function fetchForthBalance(
  clientId: string,
): Promise<PlsaApiResponse<ForthBalanceResult>> {
  const res = await invokeRouting<ForthBalanceResult>({ operation: 'fetch_balance', client_id: clientId });
  return { ...res, data: res.success ? res.data : undefined };
}

export interface ContactUpdatePayload {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export async function updateForthContact(
  clientId: string,
  updates: ContactUpdatePayload,
): Promise<PlsaApiResponse<{ updated_fields: string[]; skipped?: boolean }>> {
  const res = await invokeRouting<{ updated_fields?: string[]; skipped?: boolean }>({
    operation: 'contact_update',
    client_id: clientId,
    payload: { updates },
  });
  return {
    ...res,
    data: { updated_fields: res.data?.updated_fields ?? [], skipped: res.data?.skipped },
  };
}

export async function closeForthContact(
  clientId: string,
  closeReason: 'graduated' | 'cancelled' | 'terminated' | string,
): Promise<PlsaApiResponse<{ forth_status: string }>> {
  const res = await invokeRouting<{ forth_status?: string }>({
    operation: 'contact_close',
    client_id: clientId,
    payload: { close_reason: closeReason },
  });
  return { ...res, data: { forth_status: res.data?.forth_status ?? 'closed' } };
}

export async function sendForthPaymentToCreditor(
  settlementId: string,
  paymentMethod: 'ach' | 'rcc' = 'ach',
): Promise<PlsaApiResponse<{ external_payment_id: string; scheduled_date: string; status: string }>> {
  const res = await invokeRouting<{ external_payment_id?: string; scheduled_date?: string; status?: string }>({
    operation: 'payment_to_creditor',
    settlement_id: settlementId,
    payload: { payment_method: paymentMethod },
  });
  return {
    ...res,
    data: res.success && res.data?.external_payment_id
      ? {
          external_payment_id: res.data.external_payment_id,
          scheduled_date: res.data.scheduled_date ?? '',
          status: res.data.status ?? 'scheduled',
        }
      : undefined,
  };
}
