// Cornerstone Phase 3D — send a settlement disbursement to Forth Pay.
//
// Input: { settlement_id: string, payment_method?: 'ach' | 'rcc' }
// Output: { success, external_payment_id, scheduled_date, status }
//
// Pre-conditions:
//   - settlement.attorney_approved = true
//   - settlement.status indicates it's ready to send (accepted, in_progress)
//   - escrow balance on parent service >= offer_amount (best-effort local check)
//   - payee resolved from liability.current_creditor_id
//
// TODO(forth-docs): confirm disbursement endpoint + payload shape. Stubbed as
// POST /v1/payments with a guessed payload. Real spec will likely require payee
// bank info, RCC vs ACH selection, processing date offset rules, etc.

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
    const { settlement_id, payment_method = 'ach' } = await req.json();
    if (!settlement_id) throw new Error('settlement_id is required');

    // Load settlement + liability + service + client + creditor
    const { data: settlement, error: sErr } = await supabase
      .from('settlements')
      .select(`
        id, offer_amount, status, attorney_approved, first_payment_date,
        external_payment_id, payment_send_status,
        liability:liabilities!liability_id (
          id, current_creditor_id, account_number,
          client_service:client_services!client_service_id (
            id, escrow_balance, owning_company_id,
            primary_client_id,
            client:clients!primary_client_id ( id, forth_crm_id, company_id )
          )
        )
      `)
      .eq('id', settlement_id)
      .single();

    if (sErr || !settlement) throw new Error(`Settlement not found: ${sErr?.message}`);
    if (!settlement.attorney_approved) throw new Error('Settlement is not attorney-approved');
    if (settlement.external_payment_id) {
      throw new Error(`Payment already sent (external_payment_id=${settlement.external_payment_id})`);
    }

    // deno-lint-ignore no-explicit-any
    const liability: any = settlement.liability;
    if (!liability) throw new Error('Settlement has no linked liability');
    const service = liability.client_service;
    if (!service) throw new Error('Liability has no linked service');
    const client = service.client;
    if (!client) throw new Error('Service has no primary client');
    if (!client.forth_crm_id) throw new Error('Client is not linked to Forth');

    const offerAmount = Number(settlement.offer_amount);
    const escrow = Number(service.escrow_balance ?? 0);
    if (escrow < offerAmount) {
      throw new Error(`Insufficient escrow: balance ${escrow} < offer ${offerAmount}`);
    }

    // Look up creditor for payee info
    const { data: creditor } = await supabase
      .from('creditors')
      .select('id, name')
      .eq('id', liability.current_creditor_id)
      .maybeSingle();

    const token = await getAccessToken(service.owning_company_id ?? client.company_id ?? undefined);

    // TODO(forth-docs): real disbursement payload shape.
    const payload = {
      contact_id: client.forth_crm_id,
      payee_name: creditor?.name ?? 'Unknown creditor',
      payee_account_number: liability.account_number ?? null,
      amount: offerAmount,
      payment_method, // 'ach' | 'rcc'
      scheduled_date: settlement.first_payment_date ?? new Date().toISOString().slice(0, 10),
      reference: `settlement:${settlement.id}`,
    };

    // Mark as 'sending' before the call so a crash leaves a breadcrumb.
    await supabase
      .from('settlements')
      .update({ payment_send_status: 'sending' })
      .eq('id', settlement_id);

    const resp = await forthFetch(
      'https://api.forthpay.com/v1/payments',
      { method: 'POST', headers: buildForthHeaders(token), body: JSON.stringify(payload) },
      { caller: 'forth-payment-to-creditor', companyId: service.owning_company_id ?? undefined },
    );

    const text = await resp.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }

    await supabase.from('plsa_sync_log').insert({
      entity_type: 'settlement',
      entity_id: settlement_id,
      action: 'payment_to_creditor',
      success: resp.ok,
      request_payload: payload,
      response_payload: body,
      error_message: resp.ok ? null : `${resp.status}: ${text}`,
    });

    if (!resp.ok) {
      await supabase
        .from('settlements')
        .update({ payment_send_status: 'failed' })
        .eq('id', settlement_id);
      throw new Error(`Forth payment failed (${resp.status}): ${text}`);
    }

    // TODO(forth-docs): confirm response keys.
    const externalPaymentId =
      body.payment_id ?? body.id ?? body.data?.id ?? body.response?.payment_id ?? null;
    const scheduledDate = body.scheduled_date ?? body.process_date ?? payload.scheduled_date;
    const forthStatus = body.status ?? 'scheduled';

    if (!externalPaymentId) {
      await supabase
        .from('settlements')
        .update({ payment_send_status: 'sent_no_id', payment_sent_at: new Date().toISOString() })
        .eq('id', settlement_id);
      throw new Error('Forth accepted payment but returned no external_payment_id');
    }

    await supabase
      .from('settlements')
      .update({
        external_payment_id: externalPaymentId,
        payment_method,
        payment_sent_at: new Date().toISOString(),
        payment_send_status: 'sent',
      })
      .eq('id', settlement_id);

    return new Response(
      JSON.stringify({
        success: true,
        external_payment_id: externalPaymentId,
        scheduled_date: scheduledDate,
        status: forthStatus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[forth-payment-to-creditor]', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
