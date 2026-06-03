// forth-contact-close — close a Forth CRM contact (PUT /close, falling back to DELETE), then set
// the local clients.forth_status = 'closed'. No-ops the Forth call if not linked.
// TODO(forth-docs): confirm close vs delete semantics.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";

const InputSchema = z.object({
  client_id: z.string().uuid(),
  close_reason: z.string().min(1),
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
  const { client_id, close_reason } = parsed.data;

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
      await supabase.from("clients").update({ forth_status: "closed" }).eq("id", client_id);
      return jsonResponse(req, { success: true, skipped: true, reason: "not_linked_to_forth" });
    }

    const token = await getAccessToken(client.company_id ?? undefined);
    const headers = buildForthHeaders(token);
    const companyId = client.company_id ?? undefined;
    let resp = await forthFetch(
      `https://api.forthcrm.com/v1/contacts/${client.forth_crm_id}/close`,
      { method: "PUT", headers, body: JSON.stringify({ reason: close_reason }) },
      { caller: "forth-contact-close", companyId },
    );
    if (resp.status === 404 || resp.status === 405) {
      resp = await forthFetch(
        `https://api.forthcrm.com/v1/contacts/${client.forth_crm_id}`,
        { method: "DELETE", headers },
        { caller: "forth-contact-close", companyId },
      );
    }
    const body = await resp.json().catch(() => ({}));
    await supabase.from("plsa_sync_log").insert({
      entity_type: "client",
      entity_id: client_id,
      action: "contact_close",
      provider_id: "forth",
      request_payload: { forth_crm_id: client.forth_crm_id, close_reason },
      response_payload: body,
      success: resp.ok,
      error_message: resp.ok ? null : `${resp.status}`,
    });
    if (!resp.ok)
      return jsonResponse(
        req,
        { success: false, error: `Forth close failed: ${resp.status}` },
        502,
      );

    await supabase.from("clients").update({ forth_status: "closed" }).eq("id", client_id);
    return jsonResponse(req, { success: true, forth_status: "closed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("forth-contact-close error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
