// forth-cancel-draft — cancel a Forth Pay draft for a local transaction.
// Enforces the 7-day lock window and status guards before calling Forth.
// TODO(forth-docs): confirm the cancel endpoint shape against the Forth Pay API spec.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";
import { isWithinLockWindow } from "../_shared/forthLogic.ts";

const InputSchema = z.object({ transaction_id: z.string().uuid() });

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
    const { data: tx, error } = await supabase
      .from("transactions")
      .select("id, external_id, status, scheduled_date")
      .eq("id", transaction_id)
      .single();
    if (error || !tx)
      return jsonResponse(req, { success: false, error: "Transaction not found" }, 404);
    if (!tx.external_id) {
      return jsonResponse(
        req,
        { success: false, error: "Transaction not yet pushed to Forth" },
        409,
      );
    }
    if (isWithinLockWindow(tx.scheduled_date)) {
      return jsonResponse(
        req,
        {
          success: false,
          error: "Cannot cancel within 7 days of processing date. Contact Forth Pay directly.",
        },
        409,
      );
    }
    if (tx.status === "cancelled")
      return jsonResponse(req, { success: false, error: "Already cancelled" }, 409);
    if (tx.status === "cleared")
      return jsonResponse(
        req,
        { success: false, error: "Cannot cancel a cleared transaction" },
        409,
      );

    const accessToken = await getAccessToken();
    const resp = await forthFetch(
      `https://api.forthpay.com/v1/drafts/${tx.external_id}/cancel`,
      { method: "POST", headers: buildForthHeaders(accessToken) },
      { caller: "forth-cancel-draft" },
    );
    const result = await resp.json().catch(() => ({}));
    const ok = resp.ok;

    await supabase.from("plsa_sync_log").insert({
      entity_type: "transaction",
      entity_id: transaction_id,
      action: "cancel",
      provider_id: "forth",
      response_payload: result,
      success: ok,
      error_message: ok ? null : `Forth cancel failed: ${resp.status}`,
    });

    if (!ok)
      return jsonResponse(
        req,
        { success: false, error: `Forth cancel failed: ${resp.status}` },
        502,
      );

    await supabase.from("transactions").update({ status: "cancelled" }).eq("id", transaction_id);
    return jsonResponse(req, { success: true, transaction_id, status: "cancelled" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("forth-cancel-draft error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
