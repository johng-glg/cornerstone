import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


// Check if draft is within the 7-day lock window
function isWithinLockWindow(scheduledDate: string | null): boolean {
  if (!scheduledDate) return false;
  
  const scheduled = new Date(scheduledDate);
  const now = new Date();
  const diffDays = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  return diffDays <= 7;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { transaction_id, process_date, amount } = await req.json();
    
    if (!transaction_id) {
      throw new Error('transaction_id is required');
    }

    if (!process_date && !amount) {
      throw new Error('At least one of process_date or amount is required');
    }

    console.log('[forth-update-draft] Processing:', transaction_id);

    // Fetch transaction with client data
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select(`
        *,
        client_service:client_services!transactions_engagement_id_fkey(
          id,
          service_number,
          primary_client:clients!engagements_primary_contact_id_fkey(
            id,
            forth_crm_id
          )
        )
      `)
      .eq('id', transaction_id)
      .single();

    if (txError || !transaction) {
      throw new Error(`Transaction not found: ${txError?.message}`);
    }

    if (!transaction.external_id) {
      throw new Error('Transaction has no external draft ID - not yet pushed to Forth');
    }

    // Check if within 7-day lock window
    if (isWithinLockWindow(transaction.scheduled_date)) {
      throw new Error('Cannot modify draft within 7 days of processing date. Contact Forth Pay directly.');
    }

    // Check current status
    if (transaction.status === 'cancelled') {
      throw new Error('Cannot update a cancelled transaction');
    }

    if (transaction.status === 'cleared') {
      throw new Error('Cannot update a cleared transaction');
    }

    const client = transaction.client_service?.primary_client;
    if (!client?.forth_crm_id) {
      throw new Error('Client does not have a Forth CRM ID');
    }

    // Get OAuth token
    const accessToken = await getAccessToken();

    // Build full payload (Forth API requires all fields on PUT)
    const newProcessDate = process_date || transaction.scheduled_date;
    const newAmount = amount ?? transaction.amount;

    const updatePayload = {
      client_id: parseInt(client.forth_crm_id, 10),
      process_date: newProcessDate,
      amount: newAmount,
      memo: `Updated draft for ${transaction.client_service?.service_number || 'service'}`,
    };

    console.log('[forth-update-draft] Updating draft:', transaction.external_id, updatePayload);

    const updateResponse = await fetch(
      `https://api.forthpay.com/v1/drafts/${transaction.external_id}`,
      {
        method: 'PUT',
        headers: {
          'Api-Key': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }
    );

    const updateResult = await updateResponse.json();

    // Log the sync attempt
    await supabase.from('forth_sync_log').insert({
      entity_type: 'transaction',
      entity_id: transaction_id,
      action: 'update',
      request_payload: updatePayload,
      response_payload: updateResult,
      success: updateResponse.ok,
      error_message: updateResponse.ok ? null : JSON.stringify(updateResult),
    });

    if (!updateResponse.ok) {
      await supabase
        .from('transactions')
        .update({ 
          sync_error: JSON.stringify(updateResult),
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', transaction_id);

      throw new Error(`Forth Pay API error: ${JSON.stringify(updateResult)}`);
    }

    // Update local transaction
    const localUpdates: any = {
      last_sync_at: new Date().toISOString(),
      sync_error: null,
    };

    if (process_date) {
      localUpdates.scheduled_date = process_date;
    }

    if (amount !== undefined) {
      localUpdates.amount = amount;
    }

    await supabase
      .from('transactions')
      .update(localUpdates)
      .eq('id', transaction_id);

    console.log('[forth-update-draft] Draft updated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Draft updated in Forth Pay',
        updated: { process_date: newProcessDate, amount: newAmount },
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('[forth-update-draft] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
