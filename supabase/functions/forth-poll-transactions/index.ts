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
    // Phase 2C: prioritize never-polled rows, then oldest last_polled_at first.
    const { data: pendingTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, external_id, status, amount, last_polled_at')
      .eq('status', 'pending')
      .not('external_id', 'is', null)
      .order('last_polled_at', { ascending: true, nullsFirst: true })
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

        const response = await forthFetch(
          'https://api.forthpay.com/v1/reports/transactions',
          {
            method: 'POST',
            headers: buildForthHeaders(accessToken),
            body: JSON.stringify(reportPayload),
          },
          { caller: 'forth-poll-transactions' },
        );

        const result = await response.json();
        const transactions = result.response?.transactions || result.transactions || [];
        
        // Find matching transaction
        const forthTx = transactions.find((t: any) => 
          String(t.id) === tx.external_id || String(t.draft_id) === tx.external_id
        );

        // Phase 2C: stamp last_polled_at on every successful fetch so the cron
        // round-robins through the queue even when status hasn't changed.
        const nowIso = new Date().toISOString();

        if (forthTx) {
          const newStatus = mapForthStatus(forthTx.status);
          const isNSF = forthTx.status?.toLowerCase() === 'nsf' || 
                        forthTx.return_code === 'R01' ||
                        forthTx.error_message?.toLowerCase()?.includes('insufficient');

          const updateData: any = {
            last_polled_at: nowIso,
            last_sync_at: nowIso,
          };

          if (newStatus !== tx.status) {
            updateData.status = newStatus;
            updateData.sync_error = null;

            if (newStatus === 'cleared') {
              updateData.processed_at = forthTx.cleared_at || forthTx.processed_at || nowIso;
            }
            if (newStatus === 'failed') {
              updateData.error_message = forthTx.error_message ||
                (isNSF ? 'NSF - Insufficient Funds' : 'Transaction failed');
              updateData.sync_error = JSON.stringify(forthTx);
            }

            await supabase.from('plsa_sync_log').insert({
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

            // Phase 5A: schedule NSF retries when a draft fails due to insufficient funds.
            if (newStatus === 'failed' && isNSF) {
              try {
                await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/plsa-nsf-retry`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  },
                  body: JSON.stringify({ mode: 'schedule', transaction_id: tx.id }),
                });
              } catch (nsfErr) {
                console.error('[forth-poll-transactions] NSF schedule failed', nsfErr);
              }
            }
          }



          await supabase.from('transactions').update(updateData).eq('id', tx.id);
        } else {
          // No matching record in Forth — still mark as polled so we rotate.
          await supabase.from('transactions')
            .update({ last_polled_at: nowIso })
            .eq('id', tx.id);
        }

      } catch (txError: unknown) {
        console.error(`[forth-poll-transactions] Error polling ${tx.id}:`, txError);
        errorCount++;
        
        const txErrorMessage = txError instanceof Error ? txError.message : 'Unknown error';
        
        // Log the error
        await supabase.from('plsa_sync_log').insert({
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
