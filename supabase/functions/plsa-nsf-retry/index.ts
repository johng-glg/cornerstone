// Phase 5A — NSF retry processor.
// Two modes:
//   { mode: "schedule", transaction_id }    Schedule retries for an NSF transaction per company policy.
//   { mode: "process_due" }                 Fire all retry attempts whose scheduled_for is today or past.
//
// Retries create new transactions in `transactions` table (parent_transaction_id = original)
// then route the create_draft op through plsa-routing.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleReq { mode: "schedule"; transaction_id: string }
interface ProcessReq { mode: "process_due" }
type Req = ScheduleReq | ProcessReq;

function addDays(date: Date, days: number): Date {
  const d = new Date(date); d.setUTCDate(d.getUTCDate() + days); return d;
}
function toDateStr(d: Date): string { return d.toISOString().slice(0, 10); }

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Req>;
    const mode = body.mode ?? "process_due";

    if (mode === "schedule") {
      const transaction_id = (body as ScheduleReq).transaction_id;
      if (!transaction_id) throw new Error("transaction_id required");

      const { data: tx, error: txErr } = await supabase
        .from("transactions")
        .select("id, client_service_id, amount, scheduled_date, transaction_type, status")
        .eq("id", transaction_id).single();
      if (txErr || !tx) throw new Error(`transaction not found: ${txErr?.message}`);

      const { data: svc } = await supabase
        .from("client_services").select("owning_company_id")
        .eq("id", tx.client_service_id).single();
      const companyId = svc?.owning_company_id;
      if (!companyId) throw new Error("client_service missing company");

      const { data: policy } = await supabase
        .from("nsf_retry_policies")
        .select("id, max_attempts, delay_pattern")
        .eq("company_id", companyId).eq("is_active", true).maybeSingle();

      if (!policy) {
        return new Response(JSON.stringify({ success: true, scheduled: 0, reason: "no_active_policy" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const pattern = (policy.delay_pattern as Array<{ day_offset: number }>) ?? [];
      const baseDate = tx.scheduled_date ? new Date(tx.scheduled_date as string) : new Date();
      const inserts = [];
      const maxAttempts = Math.min(policy.max_attempts ?? 0, pattern.length);
      for (let i = 0; i < maxAttempts; i++) {
        inserts.push({
          original_transaction_id: tx.id,
          policy_id: policy.id,
          attempt_number: i + 1,
          scheduled_for: toDateStr(addDays(baseDate, pattern[i].day_offset)),
          status: "scheduled",
        });
      }
      if (inserts.length === 0) {
        return new Response(JSON.stringify({ success: true, scheduled: 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error: insErr } = await supabase
        .from("transaction_retry_attempts").insert(inserts);
      if (insErr) throw insErr;
      return new Response(JSON.stringify({ success: true, scheduled: inserts.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // process_due: find attempts scheduled <= today, status=scheduled
    const today = toDateStr(new Date());
    const { data: due, error: dueErr } = await supabase
      .from("transaction_retry_attempts")
      .select("id, original_transaction_id, attempt_number")
      .eq("status", "scheduled")
      .lte("scheduled_for", today)
      .limit(100);
    if (dueErr) throw dueErr;

    let fired = 0;
    const errors: string[] = [];
    for (const att of due ?? []) {
      try {
        const { data: orig } = await supabase
          .from("transactions")
          .select("client_service_id, amount, transaction_type, liability_id, description")
          .eq("id", att.original_transaction_id).single();
        if (!orig) throw new Error("original transaction missing");

        const retryDate = toDateStr(new Date());
        const { data: newTx, error: newErr } = await supabase
          .from("transactions").insert({
            client_service_id: orig.client_service_id,
            amount: orig.amount,
            transaction_type: orig.transaction_type,
            liability_id: orig.liability_id,
            description: `NSF retry #${att.attempt_number} of ${att.original_transaction_id}`,
            status: "pending",
            scheduled_date: retryDate,
            parent_transaction_id: att.original_transaction_id,
          }).select("id").single();
        if (newErr || !newTx) throw newErr ?? new Error("insert failed");

        // Fire create_draft through plsa-routing
        const routingResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/plsa-routing`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ operation: "create_draft", transaction_id: newTx.id }),
        });

        await supabase.from("transaction_retry_attempts").update({
          retry_transaction_id: newTx.id,
          status: routingResp.ok ? "fired" : "failed",
          fired_at: new Date().toISOString(),
          notes: routingResp.ok ? null : `routing http ${routingResp.status}`,
        }).eq("id", att.id);
        fired++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        errors.push(`${att.id}: ${msg}`);
        await supabase.from("transaction_retry_attempts").update({
          status: "failed", notes: msg,
        }).eq("id", att.id);
      }
    }

    return new Response(JSON.stringify({ success: true, fired, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[plsa-nsf-retry]", message);
    return new Response(JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
