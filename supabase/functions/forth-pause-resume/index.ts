// forth-pause-resume — pause or resume a client's drafts in Forth CRM.
// TODO(forth-docs): confirm the pause/resume endpoints.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";

const InputSchema = z.object({
  client_id: z.string().uuid(),
  action: z.enum(["pause", "resume"]),
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
  const { client_id, action } = parsed.data;

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
    if (!client.forth_crm_id) {
      return jsonResponse(req, { success: false, error: "Client not linked to Forth" }, 409);
    }

    const token = await getAccessToken(client.company_id ?? undefined);
    const resp = await forthFetch(
      `https://api.forthcrm.com/v1/contacts/${client.forth_crm_id}/${action}`,
      { method: "POST", headers: buildForthHeaders(token) },
      { caller: "forth-pause-resume", companyId: client.company_id ?? undefined },
    );
    const result = await resp.json().catch(() => ({}));
    await supabase.from("plsa_sync_log").insert({
      entity_type: "client",
      entity_id: client_id,
      action,
      provider_id: "forth",
      request_payload: { forth_crm_id: client.forth_crm_id, action },
      response_payload: result,
      success: resp.ok,
      error_message: resp.ok ? null : JSON.stringify(result),
    });
    if (!resp.ok)
      return jsonResponse(
        req,
        { success: false, error: `Forth ${action} failed: ${resp.status}` },
        502,
      );
    return jsonResponse(req, { success: true, action });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("forth-pause-resume error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
