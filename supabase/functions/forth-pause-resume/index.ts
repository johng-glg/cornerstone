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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { client_id, action } = await req.json();
    
    if (!client_id) {
      throw new Error('client_id is required');
    }

    if (!action || !['pause', 'resume'].includes(action)) {
      throw new Error('action must be "pause" or "resume"');
    }

    console.log(`[forth-pause-resume] ${action} client:`, client_id);

    // Fetch client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message}`);
    }

    if (!client.forth_crm_id) {
      throw new Error('Client does not have a Forth CRM ID. Please link client first.');
    }

    // Get OAuth token
    const accessToken = await getAccessToken();

    // Call appropriate endpoint
    const endpoint = action === 'pause' 
      ? `https://api.forthcrm.com/v1/contacts/${client.forth_crm_id}/pause`
      : `https://api.forthcrm.com/v1/contacts/${client.forth_crm_id}/resume`;

    console.log(`[forth-pause-resume] Calling ${action} endpoint:`, endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Api-Key': accessToken,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    // Log the action
    await supabase.from('forth_sync_log').insert({
      entity_type: 'client',
      entity_id: client_id,
      action: action,
      request_payload: { forth_crm_id: client.forth_crm_id, action },
      response_payload: result,
      success: response.ok,
      error_message: response.ok ? null : JSON.stringify(result),
    });

    if (!response.ok) {
      throw new Error(`Forth CRM API error: ${JSON.stringify(result)}`);
    }

    console.log(`[forth-pause-resume] Client ${action}d successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Client ${action === 'pause' ? 'paused' : 'resumed'} in Forth CRM`,
        action: action,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('[forth-pause-resume] Error:', error);
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
