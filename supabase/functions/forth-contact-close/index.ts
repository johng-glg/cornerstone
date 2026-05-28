// Cornerstone Phase 3C — close a Forth contact when service is graduated/cancelled/terminated.
//
// Input: { client_id: string, close_reason: 'graduated' | 'cancelled' | 'terminated' | string }
// Output: { success, forth_status }
//
// TODO(forth-docs): confirm endpoint. Roadmap suggests PUT /contacts/{id}/close OR DELETE.
// Using PUT /close with a body so we can pass the reason; falls back to DELETE on 404/405.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { client_id, close_reason } = await req.json();
    if (!client_id) throw new Error('client_id is required');
    if (!close_reason) throw new Error('close_reason is required');

    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id, company_id, forth_crm_id')
      .eq('id', client_id)
      .single();
    if (clientErr || !client) throw new Error(`Client not found: ${clientErr?.message}`);
    if (!client.forth_crm_id) {
      // Not linked — just mark local status and return.
      await supabase.from('clients').update({ forth_status: 'closed' }).eq('id', client_id);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'not_linked_to_forth' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const token = await getAccessToken(client.company_id ?? undefined);
    const headers = buildForthHeaders(token);

    // Attempt 1: PUT /close
    let resp = await forthFetch(
      `https://api.forthcrm.com/v1/contacts/${client.forth_crm_id}/close`,
      { method: 'PUT', headers, body: JSON.stringify({ reason: close_reason }) },
      { caller: 'forth-contact-close', companyId: client.company_id ?? undefined },
    );

    // Fallback: DELETE if the close endpoint isn't recognized.
    if (resp.status === 404 || resp.status === 405) {
      resp = await forthFetch(
        `https://api.forthcrm.com/v1/contacts/${client.forth_crm_id}`,
        { method: 'DELETE', headers },
        { caller: 'forth-contact-close', companyId: client.company_id ?? undefined },
      );
    }

    const text = await resp.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }

    await supabase.from('forth_sync_log').insert({
      entity_type: 'client',
      entity_id: client_id,
      action: 'contact_close',
      success: resp.ok,
      request_payload: { forth_crm_id: client.forth_crm_id, close_reason },
      response_payload: body,
      error_message: resp.ok ? null : `${resp.status}: ${text}`,
    });

    if (!resp.ok) throw new Error(`Forth contact close failed (${resp.status}): ${text}`);

    await supabase.from('clients').update({ forth_status: 'closed' }).eq('id', client_id);

    return new Response(
      JSON.stringify({ success: true, forth_status: 'closed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[forth-contact-close]', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
