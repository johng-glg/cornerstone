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
  const accessToken = tokenData.response?.access_token || tokenData.response?.api_key || tokenData.access_token || tokenData.api_key;
  
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
    const { client_id, forth_crm_id, action, note } = await req.json();
    
    if (!client_id) {
      throw new Error('client_id is required');
    }

    console.log('[forth-sync-client] Processing client:', client_id, 'action:', action || 'fetch');

    // Fetch client from our database
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message}`);
    }

    const crmId = forth_crm_id || client.forth_crm_id;
    
    // Get OAuth token
    const accessToken = await getAccessToken();

    // If action is 'post_note', add a note to the CRM
    if (action === 'post_note' && crmId && note) {
      console.log('[forth-sync-client] Posting note to CRM:', crmId);
      
      const notePayload = {
        note: note,
        category: 'system',
      };

      const noteResponse = await fetch(
        `https://api.forthcrm.com/v1/contacts/${crmId}/notes`,
        {
          method: 'POST',
          headers: {
            'Api-Key': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notePayload),
        }
      );

      const noteResult = await noteResponse.json();

      // Log the action
      await supabase.from('forth_sync_log').insert({
        entity_type: 'client',
        entity_id: client_id,
        action: 'sync',
        request_payload: notePayload,
        response_payload: noteResult,
        success: noteResponse.ok,
        error_message: noteResponse.ok ? null : JSON.stringify(noteResult),
      });

      return new Response(
        JSON.stringify({
          success: noteResponse.ok,
          message: noteResponse.ok ? 'Note posted to Forth CRM' : 'Failed to post note',
          result: noteResult,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: noteResponse.ok ? 200 : 500 
        }
      );
    }

    // If we have a CRM ID, fetch the contact details
    if (crmId) {
      console.log('[forth-sync-client] Fetching contact from CRM:', crmId);
      
      const contactResponse = await fetch(
        `https://api.forthcrm.com/v1/contacts/${crmId}`,
        {
          method: 'GET',
          headers: {
            'Api-Key': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      const contactResult = await contactResponse.json();

      // Log the sync
      await supabase.from('forth_sync_log').insert({
        entity_type: 'client',
        entity_id: client_id,
        action: 'sync',
        request_payload: { forth_crm_id: crmId },
        response_payload: contactResult,
        success: contactResponse.ok,
        error_message: contactResponse.ok ? null : JSON.stringify(contactResult),
      });

      if (!contactResponse.ok) {
        throw new Error(`Failed to fetch contact from Forth CRM: ${JSON.stringify(contactResult)}`);
      }

      const contact = contactResult.response || contactResult;

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Contact synced from Forth CRM',
          contact: {
            id: contact.id,
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email,
            phone: contact.phone,
            status: contact.status,
          },
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // If action is 'link' and we have a forth_crm_id, save it
    if (action === 'link' && forth_crm_id) {
      console.log('[forth-sync-client] Linking client to CRM:', forth_crm_id);
      
      await supabase
        .from('clients')
        .update({ forth_crm_id: forth_crm_id })
        .eq('id', client_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Client linked to Forth CRM',
          forth_crm_id: forth_crm_id,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // No CRM ID and no link action - return client info
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client not linked to Forth CRM. Provide forth_crm_id to link.',
        client: {
          id: client.id,
          first_name: client.first_name,
          last_name: client.last_name,
          forth_crm_id: client.forth_crm_id,
        },
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('[forth-sync-client] Error:', error);
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
