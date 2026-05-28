import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


// Map Forth status to our status
function mapForthStatus(forthStatus: string): 'pending' | 'cleared' | 'cancelled' | 'failed' {
  const statusMap: Record<string, 'pending' | 'cleared' | 'cancelled' | 'failed'> = {
    'open': 'pending',
    'pending': 'pending',
    'scheduled': 'pending',
    'processing': 'pending',
    'cleared': 'cleared',
    'completed': 'cleared',
    'settled': 'cleared',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'failed': 'failed',
    'nsf': 'failed',
    'returned': 'failed',
    'rejected': 'failed',
  };
  
  return statusMap[forthStatus?.toLowerCase()] || 'pending';
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
    console.log('[forth-poll-transactions] Starting poll...');

    // Get all pending transactions with external IDs
    const { data: pendingTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, external_id, status, amount')
      .eq('status', 'pending')
      .not('external_id', 'is', null)
      .limit(100);

    if (fetchError) {
      throw new Error(`Failed to fetch transactions: ${fetchError.message}`);
    }

    if (!pendingTransactions || pendingTransactions.length === 0) {
      console.log('[forth-poll-transactions] No pending transactions to poll');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending transactions', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[forth-poll-transactions] Polling ${pendingTransactions.length} transactions`);

    // Get OAuth token
    const accessToken = await getAccessToken();

    let updatedCount = 0;
    let errorCount = 0;

    // Poll each transaction (Forth Pay may have batch endpoint, but we'll do individual for reliability)
    for (const tx of pendingTransactions) {
      try {
        // Query Forth Pay for this draft's status
        const reportPayload = {
          draft_ids: [parseInt(tx.external_id, 10)],
        };

        const response = await fetch('https://api.forthpay.com/v1/reports/transactions', {
          method: 'POST',
          headers: {
            'Api-Key': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reportPayload),
        });

        const result = await response.json();
        const transactions = result.response?.transactions || result.transactions || [];
        
        // Find matching transaction
        const forthTx = transactions.find((t: any) => 
          String(t.id) === tx.external_id || String(t.draft_id) === tx.external_id
        );

        if (forthTx) {
          const newStatus = mapForthStatus(forthTx.status);
          const isNSF = forthTx.status?.toLowerCase() === 'nsf' || 
                        forthTx.return_code === 'R01' ||
                        forthTx.error_message?.toLowerCase()?.includes('insufficient');
          
          // Only update if status changed
          if (newStatus !== tx.status) {
            const updateData: any = {
              status: newStatus,
              last_sync_at: new Date().toISOString(),
              sync_error: null,
            };

            // Set processed_at for cleared transactions
            if (newStatus === 'cleared') {
              updateData.processed_at = forthTx.cleared_at || forthTx.processed_at || new Date().toISOString();
            }

            // Set error message for failed transactions
            if (newStatus === 'failed') {
              updateData.error_message = forthTx.error_message || 
                (isNSF ? 'NSF - Insufficient Funds' : 'Transaction failed');
              updateData.sync_error = JSON.stringify(forthTx);
            }

            await supabase
              .from('transactions')
              .update(updateData)
              .eq('id', tx.id);

            // Log the status change
            await supabase.from('forth_sync_log').insert({
              entity_type: 'transaction',
              entity_id: tx.id,
              action: 'poll',
              request_payload: reportPayload,
              response_payload: forthTx,
              success: true,
              error_message: null,
            });

            updatedCount++;
            console.log(`[forth-poll-transactions] Updated ${tx.id}: ${tx.status} -> ${newStatus}`);
          }
        }

      } catch (txError: unknown) {
        console.error(`[forth-poll-transactions] Error polling ${tx.id}:`, txError);
        errorCount++;
        
        const txErrorMessage = txError instanceof Error ? txError.message : 'Unknown error';
        
        // Log the error
        await supabase.from('forth_sync_log').insert({
          entity_type: 'transaction',
          entity_id: tx.id,
          action: 'poll',
          request_payload: { external_id: tx.external_id },
          response_payload: null,
          success: false,
          error_message: txErrorMessage,
        });
      }
    }

    console.log(`[forth-poll-transactions] Complete: ${updatedCount} updated, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        polled: pendingTransactions.length,
        updated: updatedCount,
        errors: errorCount,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('[forth-poll-transactions] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
