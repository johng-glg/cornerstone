// plsa-escrow-sync — for each active service, fetch the provider balance via plsa-routing and
// write escrow_balance_synced; record an escrow_drift finding when the provider flags drift.
// Service-role (nightly cron) or authenticated caller.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const InputSchema = z
  .object({ limit: z.number().int().positive().max(1000).optional() })
  .optional();

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
  const limit = parsed.data?.limit ?? 500;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: services, error } = await supabase
      .from("client_services")
      .select("id, primary_client_id, owning_company_id, plsa_provider_id")
      .eq("status", "active")
      .not("primary_client_id", "is", null)
      .limit(limit);
    if (error) throw new Error(error.message);

    let synced = 0;
    let drift = 0;
    const errors: string[] = [];

    for (const svc of services ?? []) {
      try {
        const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/plsa-routing`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ operation: "fetch_balance", client_id: svc.primary_client_id }),
        });
        const body = await resp.json().catch(() => ({}));
        if (!resp.ok || !body?.success) {
          errors.push(`svc ${svc.id}: ${body?.error ?? resp.status}`);
          continue;
        }
        await supabase
          .from("client_services")
          .update({
            escrow_balance_synced: body.balance,
            escrow_balance_synced_at:
              body.balance_snapshot?.as_of_timestamp ?? new Date().toISOString(),
          })
          .eq("id", svc.id);
        synced += 1;

        if (body.drift_detected) {
          drift += 1;
          await supabase.from("reconciliation_findings").upsert(
            {
              company_id: svc.owning_company_id,
              detector: "escrow_drift",
              severity: "warning",
              entity_type: "client_services",
              entity_id: svc.id,
              summary: `Escrow drift detected on service ${svc.id}`,
              details: { provider_balance: body.balance, local_projection: body.local_projection },
              status: "open",
            },
            { onConflict: "detector,entity_type,entity_id", ignoreDuplicates: false },
          );
        }
      } catch (e) {
        errors.push(`svc ${svc.id}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    return jsonResponse(req, {
      success: true,
      processed: services?.length ?? 0,
      synced,
      drift,
      error_count: errors.length,
      errors: errors.slice(0, 25),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("plsa-escrow-sync error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
