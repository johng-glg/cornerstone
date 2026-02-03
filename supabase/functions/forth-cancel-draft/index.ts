import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

function normalize(s: string): string {
  return s.replace(/[\r\n\s]+/g, '');
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 300000) {
    return cachedToken.token;
  }

  const clientId = Deno.env.get('FORTH_CLIENT_ID');
  const clientSecret = Deno.env.get('FORTH_API_KEY');

  if (!clientId || !clientSecret) {
    throw new Error('Missing FORTH_CLIENT_ID or FORTH_API_KEY');
  }

  const tokenResponse = await fetch('https://api.forthcrm.com/v1/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: normalize(clientSecret),
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`OAuth failed: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.response?.access_token || tokenData.access_token;
  
  cachedToken = {
    token: accessToken,
    expiresAt: now + (9 * 24 * 60 * 60 * 1000),
  };

  return accessToken;
}

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
    const { transaction_id } = await req.json();
    
    if (!transaction_id) {
      throw new Error('transaction_id is required');
    }

    console.log('[forth-cancel-draft] Processing:', transaction_id);

    // Fetch transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
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
      throw new Error('Cannot cancel draft within 7 days of processing date. Contact Forth Pay directly.');
    }

    // Check current status
    if (transaction.status === 'cancelled') {
      throw new Error('Transaction is already cancelled');
    }

    if (transaction.status === 'cleared') {
      throw new Error('Cannot cancel a cleared transaction');
    }

    // Get OAuth token
    const accessToken = await getAccessToken();

    // Cancel draft in Forth Pay
    console.log('[forth-cancel-draft] Cancelling draft:', transaction.external_id);

    const cancelResponse = await fetch(
      `https://api.forthpay.com/v1/drafts/${transaction.external_id}/cancel`,
      {
        method: 'POST',
        headers: {
          'Api-Key': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    const cancelResult = await cancelResponse.json();

    // Log the sync attempt
    await supabase.from('forth_sync_log').insert({
      entity_type: 'transaction',
      entity_id: transaction_id,
      action: 'cancel',
      request_payload: { draft_id: transaction.external_id },
      response_payload: cancelResult,
      success: cancelResponse.ok,
      error_message: cancelResponse.ok ? null : JSON.stringify(cancelResult),
    });

    if (!cancelResponse.ok) {
      await supabase
        .from('transactions')
        .update({ 
          sync_error: JSON.stringify(cancelResult),
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', transaction_id);

      throw new Error(`Forth Pay API error: ${JSON.stringify(cancelResult)}`);
    }

    // Update transaction status
    await supabase
      .from('transactions')
      .update({
        status: 'cancelled',
        last_sync_at: new Date().toISOString(),
        sync_error: null,
      })
      .eq('id', transaction_id);

    console.log('[forth-cancel-draft] Draft cancelled successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Draft cancelled in Forth Pay',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('[forth-cancel-draft] Error:', error);
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
