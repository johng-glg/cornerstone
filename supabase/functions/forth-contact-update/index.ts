// Cornerstone Phase 3B — push contact field updates to Forth CRM.
//
// Input: { client_id: string, updates: { first_name?, last_name?, email?, phone?, address?, city?, state?, zip? } }
// Output: { success, updated_fields: string[] }
//
// TODO(forth-docs): confirm PUT vs PATCH + payload key names. Using PUT per roadmap guess.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactUpdates {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { client_id, updates } = await req.json() as { client_id: string; updates: ContactUpdates };
    if (!client_id) throw new Error('client_id is required');
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('updates payload cannot be empty');
    }

    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id, company_id, forth_crm_id')
      .eq('id', client_id)
      .single();
    if (clientErr || !client) throw new Error(`Client not found: ${clientErr?.message}`);
    if (!client.forth_crm_id) {
      // No-op: client not in Forth yet. Treat as success so calling save flow doesn't break.
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'not_linked_to_forth' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const token = await getAccessToken(client.company_id ?? undefined);
    const resp = await forthFetch(
      `https://api.forthcrm.com/v1/contacts/${client.forth_crm_id}`,
      {
        method: 'PUT',
        headers: buildForthHeaders(token),
        body: JSON.stringify(updates),
      },
      { caller: 'forth-contact-update', companyId: client.company_id ?? undefined },
    );

    const text = await resp.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }

    await supabase.from('plsa_sync_log').insert({
      entity_type: 'client',
      entity_id: client_id,
      action: 'contact_update',
      success: resp.ok,
      request_payload: { forth_crm_id: client.forth_crm_id, updates },
      response_payload: body,
      error_message: resp.ok ? null : `${resp.status}: ${text}`,
    });

    if (!resp.ok) throw new Error(`Forth contact update failed (${resp.status}): ${text}`);

    return new Response(
      JSON.stringify({ success: true, updated_fields: Object.keys(updates) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[forth-contact-update]', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
