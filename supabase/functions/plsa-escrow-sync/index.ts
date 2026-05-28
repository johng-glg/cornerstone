// Phase 5B — Nightly escrow balance sync.
// Iterates active client_services with a forth-linked client, calls plsa-routing fetch_balance,
// writes canonical balance back onto client_services.escrow_balance_synced / _synced_at.

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
    // Active services with a primary client linked to Forth
    const { data: services, error } = await supabase
      .from("client_services")
      .select("id, primary_client_id, owning_company_id, plsa_provider_id, clients:primary_client_id(forth_crm_id)")
      .eq("status", "active")
      .not("primary_client_id", "is", null)
      .limit(500);
    if (error) throw error;

    let synced = 0;
    let drift = 0;
    const errors: string[] = [];

    for (const svc of services ?? []) {
      const forthId = (svc as any).clients?.forth_crm_id;
      if (!forthId) continue;
      try {
        const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/plsa-routing`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            operation: "fetch_balance",
            client_id: svc.primary_client_id,
          }),
        });
        const body = await resp.json().catch(() => ({}));
        if (!resp.ok || !body?.success) {
          errors.push(`svc ${svc.id}: ${body?.error ?? resp.status}`);
          continue;
        }

        await supabase.from("client_services").update({
          escrow_balance_synced: body.balance,
          escrow_balance_synced_at: body.as_of_timestamp ?? new Date().toISOString(),
        }).eq("id", svc.id);
        synced++;
        if (body.drift_detected) {
          drift++;
          // upsert recon finding (open per detector+entity unique idx)
          await supabase.from("reconciliation_findings").upsert({
            company_id: svc.owning_company_id,
            detector: "escrow_drift",
            severity: "warning",
            entity_type: "client_services",
            entity_id: svc.id,
            summary: `Escrow drift detected on service ${svc.id}`,
            details: {
              forth_balance: body.balance,
              local_projection: body.local_projection,
            },
            status: "open",
          }, { onConflict: "detector,entity_type,entity_id", ignoreDuplicates: false });
        }
      } catch (e) {
        errors.push(`svc ${svc.id}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: services?.length ?? 0,
      synced, drift, error_count: errors.length,
      errors: errors.slice(0, 25),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[plsa-escrow-sync]", message);
    return new Response(JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
