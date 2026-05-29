// forth-create-draft — create a Forth Pay draft for a local transaction and store its external id.
// TODO(forth-docs): confirm the drafts endpoint payload/response shape against the Forth Pay spec.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";

const InputSchema = z.object({ transaction_id: z.string().uuid() });

function defaultProcessDate(scheduled: string | null): string {
  if (scheduled) return scheduled;
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

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
  const { transaction_id } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .select("id, amount, transaction_type, scheduled_date, external_id, client_service_id")
      .eq("id", transaction_id)
      .single();
    if (txErr || !tx)
      return jsonResponse(req, { success: false, error: "Transaction not found" }, 404);
    if (tx.external_id) {
      return jsonResponse(
        req,
        { success: false, error: "Transaction already has a Forth draft" },
        409,
      );
    }

    // Resolve the client's Forth CRM id via the owning service (separate lookups — robust to FK
    // relationship naming).
    let serviceNumber: string | null = null;
    let forthCrmId: string | null = null;
    if (tx.client_service_id) {
      const { data: cs } = await supabase
        .from("client_services")
        .select("service_number, primary_client_id")
        .eq("id", tx.client_service_id)
        .maybeSingle();
      serviceNumber = cs?.service_number ?? null;
      if (cs?.primary_client_id) {
        const { data: client } = await supabase
          .from("clients")
          .select("forth_crm_id")
          .eq("id", cs.primary_client_id)
          .maybeSingle();
        forthCrmId = client?.forth_crm_id ?? null;
      }
    }
    if (!forthCrmId) {
      return jsonResponse(
        req,
        { success: false, error: "Client has no Forth CRM id — sync client first" },
        409,
      );
    }

    const draftPayload = {
      client_id: parseInt(forthCrmId, 10),
      process_date: defaultProcessDate(tx.scheduled_date),
      amount: tx.amount,
      memo: `Draft for ${serviceNumber ?? "service"} - ${tx.transaction_type}`,
    };

    const accessToken = await getAccessToken();
    const resp = await forthFetch(
      "https://api.forthpay.com/v1/drafts",
      {
        method: "POST",
        headers: buildForthHeaders(accessToken),
        body: JSON.stringify(draftPayload),
      },
      { caller: "forth-create-draft" },
    );
    const result = await resp.json().catch(() => ({}));

    await supabase.from("plsa_sync_log").insert({
      entity_type: "transaction",
      entity_id: transaction_id,
      action: "create",
      provider_id: "forth",
      request_payload: draftPayload,
      response_payload: result,
      success: resp.ok,
      error_message: resp.ok ? null : JSON.stringify(result),
    });

    if (!resp.ok) {
      await supabase
        .from("transactions")
        .update({ sync_error: JSON.stringify(result), last_sync_at: new Date().toISOString() })
        .eq("id", transaction_id);
      return jsonResponse(req, { success: false, error: `Forth Pay error: ${resp.status}` }, 502);
    }

    const draftId = result.response?.id ?? result.id;
    await supabase
      .from("transactions")
      .update({
        external_id: draftId != null ? String(draftId) : null,
        status: "pending",
        sync_error: null,
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", transaction_id);

    return jsonResponse(req, { success: true, transaction_id, external_id: draftId ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("forth-create-draft error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
