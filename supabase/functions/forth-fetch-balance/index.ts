// forth-fetch-balance — read a client's Forth Pay balance and reconcile against the local escrow
// projection; logs an escrow_drift audit event on material drift.
// TODO(forth-docs): confirm the balance endpoint + response shape.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";
import { detectEscrowDrift } from "../_shared/escrow.ts";

const InputSchema = z.object({ client_id: z.string().uuid() });

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
  const { client_id } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: client, error } = await supabase
      .from("clients")
      .select("id, company_id, forth_crm_id")
      .eq("id", client_id)
      .single();
    if (error || !client)
      return jsonResponse(req, { success: false, error: "Client not found" }, 404);
    if (!client.forth_crm_id)
      return jsonResponse(req, { success: false, error: "Client not linked to Forth" }, 409);

    const token = await getAccessToken(client.company_id ?? undefined);
    const resp = await forthFetch(
      `https://api.forthcrm.com/v1/contacts/${client.forth_crm_id}/balance`,
      { method: "GET", headers: buildForthHeaders(token) },
      { caller: "forth-fetch-balance", companyId: client.company_id ?? undefined },
    );
    const result = await resp.json().catch(() => ({}));
    if (!resp.ok)
      return jsonResponse(
        req,
        { success: false, error: `Forth balance failed: ${resp.status}` },
        502,
      );

    const remote = Number(result.response?.balance ?? result.balance ?? 0);

    // Local projection: sum of escrow_balance across the client's services.
    const { data: services } = await supabase
      .from("client_services")
      .select("escrow_balance")
      .eq("primary_client_id", client_id);
    const local = (services ?? []).reduce(
      (sum: number, s: { escrow_balance: number | null }) => sum + Number(s.escrow_balance ?? 0),
      0,
    );

    const { drift, drift_detected } = detectEscrowDrift(local, remote);
    if (drift_detected) {
      await supabase.rpc("log_audit_event", {
        _action: "escrow_drift_detected",
        _entity_type: "client",
        _entity_id: client_id,
        _company_id: client.company_id ?? null,
        _request_payload: { local_projection: local, forth_balance: remote, drift },
      });
    }

    return jsonResponse(req, {
      success: true,
      balance: remote,
      balance_snapshot: {
        balance_cents: Math.round(remote * 100),
        as_of_timestamp: new Date().toISOString(),
      },
      local_projection: local,
      drift_detected,
      source: "forth",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("forth-fetch-balance error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
