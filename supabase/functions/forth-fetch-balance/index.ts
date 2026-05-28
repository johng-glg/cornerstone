// Cornerstone Phase 3A — fetch canonical escrow balance from Forth Pay.
//
// Input: { client_id: string }
// Output: { success, balance_cents, balance, as_of_timestamp, source: 'forth', drift_detected? }
//
// NOTE: Forth Pay balance endpoint URL is BEST GUESS until docs are confirmed.
// See `roadmap` 3A. If the call fails with 404 we surface a clear error so an
// operator knows the path needs updating — we do NOT swallow into a fake zero.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TODO(forth-docs): confirm canonical endpoint. Roadmap notes Forth Pay base differs from CRM.
// Possible shapes: GET /v1/contacts/{id}/balance  or  GET /v1/clients/{id}/escrow
const BALANCE_URL = (forthCrmId: string) =>
  `https://api.forthpay.com/v1/contacts/${forthCrmId}/balance`;

const DRIFT_DOLLARS = 1.0;
const DRIFT_PCT = 0.05;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { client_id } = await req.json();
    if (!client_id) throw new Error('client_id is required');

    // Lookup forth_crm_id + local projection
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id, company_id, forth_crm_id')
      .eq('id', client_id)
      .single();
    if (clientErr || !client) throw new Error(`Client not found: ${clientErr?.message}`);
    if (!client.forth_crm_id) throw new Error('Client is not linked to Forth (no forth_crm_id)');

    // Local projection = sum of cleared transactions across all this client's services
    const { data: services } = await supabase
      .from('client_services')
      .select('id, escrow_balance')
      .eq('primary_client_id', client_id);

    const localProjection = (services ?? []).reduce(
      (sum, s) => sum + (Number(s.escrow_balance) || 0),
      0,
    );

    // Call Forth
    const token = await getAccessToken(client.company_id ?? undefined);
    const resp = await forthFetch(
      BALANCE_URL(client.forth_crm_id),
      { method: 'GET', headers: buildForthHeaders(token) },
      { caller: 'forth-fetch-balance', companyId: client.company_id ?? undefined },
    );

    const text = await resp.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }

    await supabase.from('forth_sync_log').insert({
      entity_type: 'client',
      entity_id: client_id,
      action: 'fetch_balance',
      success: resp.ok,
      request_payload: { forth_crm_id: client.forth_crm_id },
      response_payload: body,
      error_message: resp.ok ? null : `${resp.status}: ${text}`,
    });

    if (!resp.ok) {
      throw new Error(`Forth balance fetch failed (${resp.status}): ${text}`);
    }

    // TODO(forth-docs): confirm response shape. Defensive parsing across guesses.
    const balance =
      Number(body.balance ?? body.escrow_balance ?? body.data?.balance ?? body.response?.balance ?? 0);
    const asOf = body.as_of ?? body.timestamp ?? new Date().toISOString();

    // Drift detection
    const drift = Math.abs(balance - localProjection);
    const driftPct = localProjection > 0 ? drift / localProjection : 0;
    const driftDetected = drift > DRIFT_DOLLARS && driftPct > DRIFT_PCT;

    if (driftDetected) {
      await supabase.rpc('log_audit_event', {
        _action: 'escrow_drift_detected',
        _entity_type: 'clients',
        _entity_id: client_id,
        _company_id: client.company_id,
        _request_payload: {
          local_projection: localProjection,
          forth_balance: balance,
          drift_dollars: drift,
          drift_pct: driftPct,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        balance,
        balance_cents: Math.round(balance * 100),
        as_of_timestamp: asOf,
        source: 'forth',
        local_projection: localProjection,
        drift_detected: driftDetected,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[forth-fetch-balance]', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
