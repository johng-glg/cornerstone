// plsa-nsf-retry — schedule NSF retries for a failed draft, and fire due retries.
//   schedule     : build retry attempts from the company's active nsf_retry_policy
//   process_due  : for attempts due today, create a retry transaction + push a draft via routing
// Service-role (cron) or authenticated caller.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { buildRetryInserts, toDateStr, type RetryStep } from "../_shared/nsfRetry.ts";

const InputSchema = z
  .object({
    mode: z.enum(["schedule", "process_due"]).default("process_due"),
    transaction_id: z.string().uuid().optional(),
  })
  .refine((v) => v.mode !== "schedule" || !!v.transaction_id, {
    message: "schedule mode requires transaction_id",
  });

async function callRouting(operation: string, body: Record<string, unknown>): Promise<Response> {
  return await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/plsa-routing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ operation, ...body }),
  });
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  const gate = await requireAuth(req);
  if (gate instanceof Response) return gate;

  const parsed = InputSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return jsonResponse(
      req,
      { success: false, error: "Invalid request", issues: parsed.error.issues },
      400,
    );
  }
  const { mode, transaction_id } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (mode === "schedule") {
      const { data: tx } = await supabase
        .from("transactions")
        .select("id, client_service_id, scheduled_date")
        .eq("id", transaction_id)
        .single();
      if (!tx) return jsonResponse(req, { success: false, error: "transaction not found" }, 404);
      const { data: svc } = await supabase
        .from("client_services")
        .select("owning_company_id")
        .eq("id", tx.client_service_id)
        .maybeSingle();
      if (!svc?.owning_company_id)
        return jsonResponse(req, { success: false, error: "service missing company" }, 409);
      const { data: policy } = await supabase
        .from("nsf_retry_policies")
        .select("id, max_attempts, delay_pattern")
        .eq("company_id", svc.owning_company_id)
        .eq("is_active", true)
        .maybeSingle();
      if (!policy)
        return jsonResponse(req, { success: true, scheduled: 0, reason: "no_active_policy" });

      const base = tx.scheduled_date ? new Date(tx.scheduled_date) : new Date();
      const inserts = buildRetryInserts(
        tx.id,
        policy.id,
        base,
        (policy.delay_pattern as RetryStep[]) ?? [],
        policy.max_attempts ?? 0,
      );
      if (inserts.length === 0) return jsonResponse(req, { success: true, scheduled: 0 });
      const { error } = await supabase.from("transaction_retry_attempts").insert(inserts);
      if (error) throw new Error(error.message);
      return jsonResponse(req, { success: true, scheduled: inserts.length });
    }

    // process_due
    const today = toDateStr(new Date());
    const { data: due } = await supabase
      .from("transaction_retry_attempts")
      .select("id, original_transaction_id, attempt_number")
      .eq("status", "scheduled")
      .lte("scheduled_for", today)
      .limit(100);

    let fired = 0;
    const errors: string[] = [];
    for (const att of due ?? []) {
      try {
        const { data: orig } = await supabase
          .from("transactions")
          .select("client_service_id, amount, transaction_type, liability_id")
          .eq("id", att.original_transaction_id)
          .single();
        if (!orig) throw new Error("original transaction missing");
        const { data: newTx, error: newErr } = await supabase
          .from("transactions")
          .insert({
            client_service_id: orig.client_service_id,
            amount: orig.amount,
            transaction_type: orig.transaction_type,
            liability_id: orig.liability_id,
            description: `NSF retry #${att.attempt_number} of ${att.original_transaction_id}`,
            status: "pending",
            scheduled_date: today,
            parent_transaction_id: att.original_transaction_id,
          })
          .select("id")
          .single();
        if (newErr || !newTx) throw new Error(newErr?.message ?? "insert failed");
        const routingResp = await callRouting("create_draft", { transaction_id: newTx.id });
        await supabase
          .from("transaction_retry_attempts")
          .update({
            retry_transaction_id: newTx.id,
            status: routingResp.ok ? "fired" : "failed",
            fired_at: new Date().toISOString(),
            notes: routingResp.ok ? null : `routing http ${routingResp.status}`,
          })
          .eq("id", att.id);
        fired += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        errors.push(`${att.id}: ${msg}`);
        await supabase
          .from("transaction_retry_attempts")
          .update({ status: "failed", notes: msg })
          .eq("id", att.id);
      }
    }
    return jsonResponse(req, { success: true, fired, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("plsa-nsf-retry error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
