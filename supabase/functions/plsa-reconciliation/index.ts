// plsa-reconciliation — hourly detectors that open reconciliation_findings:
//   stale_pending_tx     : pending tx not polled in >6h (also force-polls via routing)
//   escrow_balance_stale : active service not balance-synced in >36h
//   escrow_drift         : count of open drift findings (created by escrow-sync/fetch-balance)
// Service-role (cron) or authenticated caller.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const InputSchema = z.object({}).optional();

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const summary = {
    stale_pending_tx: 0,
    escrow_balance_stale: 0,
    escrow_drift_open: 0,
    force_polled: false,
  };

  try {
    // 1) stale pending transactions (>6h since last poll)
    const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
    const { data: staleTx } = await supabase
      .from("transactions")
      .select("id, client_service_id, external_id, last_polled_at")
      .eq("status", "pending")
      .not("external_id", "is", null)
      .or(`last_polled_at.is.null,last_polled_at.lt.${sixHoursAgo}`)
      .limit(200);

    for (const tx of staleTx ?? []) {
      const { data: svc } = await supabase
        .from("client_services")
        .select("owning_company_id")
        .eq("id", tx.client_service_id)
        .maybeSingle();
      await supabase.from("reconciliation_findings").upsert(
        {
          company_id: svc?.owning_company_id ?? null,
          detector: "stale_pending_tx",
          severity: "warning",
          entity_type: "transactions",
          entity_id: tx.id,
          summary: "Pending transaction not polled in >6h",
          details: { last_polled_at: tx.last_polled_at, external_id: tx.external_id },
          status: "open",
        },
        { onConflict: "detector,entity_type,entity_id" },
      );
      summary.stale_pending_tx += 1;
    }

    if ((staleTx?.length ?? 0) > 0) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/plsa-routing`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ operation: "poll_transactions" }),
        });
        summary.force_polled = true;
      } catch {
        /* best-effort */
      }
    }

    // 2) escrow balance stale (>36h)
    const cutoff = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
    const { data: staleSvc } = await supabase
      .from("client_services")
      .select("id, owning_company_id, escrow_balance_synced_at")
      .eq("status", "active")
      .or(`escrow_balance_synced_at.is.null,escrow_balance_synced_at.lt.${cutoff}`)
      .limit(200);
    for (const svc of staleSvc ?? []) {
      await supabase.from("reconciliation_findings").upsert(
        {
          company_id: svc.owning_company_id,
          detector: "escrow_balance_stale",
          severity: "info",
          entity_type: "client_services",
          entity_id: svc.id,
          summary: "Escrow balance not synced from the provider in >36h",
          details: { last_synced_at: svc.escrow_balance_synced_at },
          status: "open",
        },
        { onConflict: "detector,entity_type,entity_id" },
      );
      summary.escrow_balance_stale += 1;
    }

    // 3) open drift findings (counted; created by escrow-sync / fetch-balance)
    const { count } = await supabase
      .from("reconciliation_findings")
      .select("*", { count: "exact", head: true })
      .eq("detector", "escrow_drift")
      .eq("status", "open");
    summary.escrow_drift_open = count ?? 0;

    return jsonResponse(req, { success: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("plsa-reconciliation error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
