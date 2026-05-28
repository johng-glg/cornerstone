import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { transaction_id } = await req.json();
    
    if (!transaction_id) {
      throw new Error('transaction_id is required');
    }

    console.log('[forth-create-draft] Processing transaction:', transaction_id);

    // Fetch transaction with related data
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select(`
        *,
        client_service:client_services!transactions_engagement_id_fkey(
          id,
          service_number,
          primary_client:clients!engagements_primary_contact_id_fkey(
            id,
            first_name,
            last_name,
            email,
            forth_crm_id
          )
        )
      `)
      .eq('id', transaction_id)
      .single();

    if (txError || !transaction) {
      throw new Error(`Transaction not found: ${txError?.message}`);
    }

    const client = transaction.client_service?.primary_client;
    if (!client?.forth_crm_id) {
      throw new Error('Client does not have a Forth CRM ID. Please sync client first.');
    }

    // Get OAuth token
    const accessToken = await getAccessToken();

    // Calculate process date (use scheduled_date or 7+ days from now)
    let processDate = transaction.scheduled_date;
    if (!processDate) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      processDate = futureDate.toISOString().split('T')[0];
    }

    // Create draft in Forth Pay
    const draftPayload = {
      client_id: parseInt(client.forth_crm_id, 10),
      process_date: processDate,
      amount: transaction.amount,
      memo: `Draft for ${transaction.client_service?.service_number || 'service'} - ${transaction.transaction_type}`,
    };

    console.log('[forth-create-draft] Creating draft:', draftPayload);

    const draftResponse = await forthFetch(
      'https://api.forthpay.com/v1/drafts',
      {
        method: 'POST',
        headers: buildForthHeaders(accessToken),
        body: JSON.stringify(draftPayload),
      },
      { caller: 'forth-create-draft' },
    );

    const draftResult = await draftResponse.json();

    // Log the sync attempt
    await supabase.from('forth_sync_log').insert({
      entity_type: 'transaction',
      entity_id: transaction_id,
      action: 'create',
      request_payload: draftPayload,
      response_payload: draftResult,
      success: draftResponse.ok,
      error_message: draftResponse.ok ? null : JSON.stringify(draftResult),
    });

    if (!draftResponse.ok) {
      // Update transaction with error
      await supabase
        .from('transactions')
        .update({ 
          sync_error: JSON.stringify(draftResult),
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', transaction_id);

      throw new Error(`Forth Pay API error: ${JSON.stringify(draftResult)}`);
    }

    // Extract draft ID from response
    const draftId = draftResult.response?.id || draftResult.id;

    // Update transaction with external ID and status
    await supabase
      .from('transactions')
      .update({
        external_id: String(draftId),
        status: 'pending',
        last_sync_at: new Date().toISOString(),
        sync_error: null,
      })
      .eq('id', transaction_id);

    console.log('[forth-create-draft] Draft created successfully:', draftId);

    return new Response(
      JSON.stringify({
        success: true,
        draft_id: draftId,
        message: 'Draft created in Forth Pay',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('[forth-create-draft] Error:', error);
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
