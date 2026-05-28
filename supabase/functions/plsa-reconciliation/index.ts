// Phase 5C — Reconciliation scanner.
// Detectors:
//   1) stale_pending_tx       — transactions.status=pending with last_polled_at > 6h ago (or null).
//                               Force-polls via plsa-routing poll_transactions and records a finding.
//   2) escrow_balance_stale   — client_services with escrow_balance_synced_at older than 36h.
//                               Records info-level finding; nightly sync should catch them.
//   3) escrow_drift           — re-emits open drift findings count (created by plsa-escrow-sync).
//
// Designed to be idempotent: open findings are upserted with unique (detector, entity_type, entity_id).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const summary = {
      stale_pending_tx: 0,
      escrow_balance_stale: 0,
      escrow_drift_open: 0,
      force_polled: false,
    };

    // 1) stale pending transactions (>6h since last poll)
    const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
    const { data: staleTx } = await supabase
      .from("transactions")
      .select("id, client_service_id, external_id, last_polled_at, client_services:client_service_id(owning_company_id)")
      .eq("status", "pending")
      .not("external_id", "is", null)
      .or(`last_polled_at.is.null,last_polled_at.lt.${sixHoursAgo}`)
      .limit(200);

    for (const tx of staleTx ?? []) {
      const companyId = (tx as any).client_services?.owning_company_id ?? null;
      await supabase.from("reconciliation_findings").upsert({
        company_id: companyId,
        detector: "stale_pending_tx",
        severity: "warning",
        entity_type: "transactions",
        entity_id: tx.id,
        summary: `Pending transaction not polled in >6h`,
        details: { last_polled_at: tx.last_polled_at, external_id: tx.external_id },
        status: "open",
      }, { onConflict: "detector,entity_type,entity_id" });
      summary.stale_pending_tx++;
    }

    // Trigger one poll cycle to clear up to date
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
      } catch (_) { /* swallow */ }
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
      await supabase.from("reconciliation_findings").upsert({
        company_id: svc.owning_company_id,
        detector: "escrow_balance_stale",
        severity: "info",
        entity_type: "client_services",
        entity_id: svc.id,
        summary: `Escrow balance not synced from Forth in >36h`,
        details: { last_synced_at: svc.escrow_balance_synced_at },
        status: "open",
      }, { onConflict: "detector,entity_type,entity_id" });
      summary.escrow_balance_stale++;
    }

    // 3) open drift findings (counted, not created here)
    const { count } = await supabase
      .from("reconciliation_findings")
      .select("*", { count: "exact", head: true })
      .eq("detector", "escrow_drift")
      .eq("status", "open");
    summary.escrow_drift_open = count ?? 0;

    return new Response(JSON.stringify({ success: true, summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[plsa-reconciliation]", message);
    return new Response(JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
