// forth-update-draft — modify a Forth Pay draft's amount and/or process_date.
// Same 7-day lock window + status guards as cancel.
// TODO(forth-docs): confirm the update endpoint (PUT /drafts/{id}) payload/response shape.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";
import { isWithinLockWindow } from "../_shared/forthLogic.ts";

const InputSchema = z
  .object({
    transaction_id: z.string().uuid(),
    amount: z.number().positive().optional(),
    process_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
      .optional(),
  })
  .refine((v) => v.amount !== undefined || v.process_date !== undefined, {
    message: "provide at least one of amount or process_date",
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
  const { transaction_id, amount, process_date } = parsed.data;

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
          error: "Cannot modify within 7 days of processing date. Contact Forth Pay directly.",
        },
        409,
      );
    }
    if (tx.status === "cancelled" || tx.status === "cleared") {
      return jsonResponse(
        req,
        { success: false, error: `Cannot modify a ${tx.status} transaction` },
        409,
      );
    }

    const body: Record<string, unknown> = {};
    if (amount !== undefined) body.amount = amount;
    if (process_date !== undefined) body.process_date = process_date;

    const accessToken = await getAccessToken();
    const resp = await forthFetch(
      `https://api.forthpay.com/v1/drafts/${tx.external_id}`,
      { method: "PUT", headers: buildForthHeaders(accessToken), body: JSON.stringify(body) },
      { caller: "forth-update-draft" },
    );
    const result = await resp.json().catch(() => ({}));

    await supabase.from("plsa_sync_log").insert({
      entity_type: "transaction",
      entity_id: transaction_id,
      action: "update",
      provider_id: "forth",
      request_payload: body,
      response_payload: result,
      success: resp.ok,
      error_message: resp.ok ? null : JSON.stringify(result),
    });

    if (!resp.ok)
      return jsonResponse(req, { success: false, error: `Forth Pay error: ${resp.status}` }, 502);

    const localUpdate: Record<string, unknown> = {
      last_sync_at: new Date().toISOString(),
      sync_error: null,
    };
    if (amount !== undefined) localUpdate.amount = amount;
    if (process_date !== undefined) localUpdate.scheduled_date = process_date;
    await supabase.from("transactions").update(localUpdate).eq("id", transaction_id);

    return jsonResponse(req, { success: true, transaction_id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("forth-update-draft error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
