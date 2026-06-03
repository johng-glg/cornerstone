// forth-payment-to-creditor — disburse a settlement to its creditor via Forth Pay.
// Guards: attorney-approved, no prior payment, sufficient local escrow. Uses a payment_send_status
// state machine ('sending' breadcrumb before the network call) to avoid double-sends on crash.
// TODO(forth-docs): confirm the disbursement endpoint + payee fields.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";

const InputSchema = z.object({
  settlement_id: z.string().uuid(),
  payment_method: z.enum(["ach", "rcc"]).default("ach"),
});

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  const gate = await requireAuth(req);
  if (gate instanceof Response) return gate;

  const parsed = InputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return jsonResponse(
      req,
      { success: false, error: "Invalid request", issues: parsed.error.issues },
      400,
    );
  }
  const { settlement_id, payment_method } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: s, error: sErr } = await supabase
      .from("settlements")
      .select(
        "id, offer_amount, attorney_approved, first_payment_date, external_payment_id, payment_send_status, liability_id",
      )
      .eq("id", settlement_id)
      .single();
    if (sErr || !s)
      return jsonResponse(req, { success: false, error: "Settlement not found" }, 404);
    if (!s.attorney_approved)
      return jsonResponse(
        req,
        { success: false, error: "Settlement is not attorney-approved" },
        409,
      );
    if (s.external_payment_id) {
      return jsonResponse(
        req,
        {
          success: false,
          error: "Payment already sent",
          external_payment_id: s.external_payment_id,
        },
        409,
      );
    }

    // Resolve payee chain via separate lookups (robust to FK relationship naming).
    const { data: liability } = await supabase
      .from("liabilities")
      .select("id, current_creditor_id, account_number, client_service_id")
      .eq("id", s.liability_id)
      .maybeSingle();
    if (!liability)
      return jsonResponse(
        req,
        { success: false, error: "Settlement has no linked liability" },
        409,
      );
    const { data: service } = await supabase
      .from("client_services")
      .select("id, escrow_balance, owning_company_id, primary_client_id")
      .eq("id", liability.client_service_id)
      .maybeSingle();
    if (!service)
      return jsonResponse(req, { success: false, error: "Liability has no linked service" }, 409);
    const { data: client } = await supabase
      .from("clients")
      .select("id, forth_crm_id, company_id")
      .eq("id", service.primary_client_id)
      .maybeSingle();
    if (!client?.forth_crm_id)
      return jsonResponse(req, { success: false, error: "Client not linked to Forth" }, 409);

    const offer = Number(s.offer_amount);
    const escrow = Number(service.escrow_balance ?? 0);
    if (escrow < offer) {
      return jsonResponse(
        req,
        { success: false, error: `Insufficient escrow: ${escrow} < ${offer}` },
        409,
      );
    }

    const { data: creditor } = await supabase
      .from("creditors")
      .select("id, name")
      .eq("id", liability.current_creditor_id)
      .maybeSingle();

    const payload = {
      contact_id: client.forth_crm_id,
      payee_name: creditor?.name ?? "Unknown creditor",
      payee_account_number: liability.account_number ?? null,
      amount: offer,
      payment_method,
      scheduled_date: s.first_payment_date ?? new Date().toISOString().slice(0, 10),
      reference: `settlement:${settlement_id}`,
    };

    // Crash breadcrumb before the network call.
    await supabase
      .from("settlements")
      .update({ payment_send_status: "sending" })
      .eq("id", settlement_id);

    const token = await getAccessToken(service.owning_company_id ?? client.company_id ?? undefined);
    const resp = await forthFetch(
      "https://api.forthpay.com/v1/payments",
      { method: "POST", headers: buildForthHeaders(token), body: JSON.stringify(payload) },
      { caller: "forth-payment-to-creditor", companyId: service.owning_company_id ?? undefined },
    );
    const body = await resp.json().catch(() => ({}));

    await supabase.from("plsa_sync_log").insert({
      entity_type: "settlement",
      entity_id: settlement_id,
      action: "payment_to_creditor",
      provider_id: "forth",
      request_payload: {
        ...payload,
        payee_account_number: payload.payee_account_number ? "****" : null,
      },
      response_payload: body,
      success: resp.ok,
      error_message: resp.ok ? null : `${resp.status}`,
    });

    if (!resp.ok) {
      await supabase
        .from("settlements")
        .update({ payment_send_status: "failed" })
        .eq("id", settlement_id);
      return jsonResponse(
        req,
        { success: false, error: `Forth payment failed: ${resp.status}` },
        502,
      );
    }

    const externalPaymentId = body.response?.id ?? body.id;
    await supabase
      .from("settlements")
      .update({
        external_payment_id: externalPaymentId != null ? String(externalPaymentId) : null,
        payment_send_status: externalPaymentId != null ? "sent" : "sent_no_id",
        payment_sent_at: new Date().toISOString(),
        payment_method,
      })
      .eq("id", settlement_id);

    return jsonResponse(req, {
      success: true,
      settlement_id,
      external_payment_id: externalPaymentId ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("forth-payment-to-creditor error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
