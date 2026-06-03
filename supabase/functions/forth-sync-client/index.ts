// forth-sync-client — multi-mode client sync with Forth CRM.
//   fetch     (default): GET the contact
//   link              : write a known forth_crm_id onto the local client
//   post_note         : POST a system note to the contact
// TODO(forth-docs): confirm contact/notes endpoints + response shapes.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";

const FORTH = "https://api.forthcrm.com/v1";
const InputSchema = z
  .object({
    client_id: z.string().uuid(),
    forth_crm_id: z.string().optional(),
    action: z.enum(["fetch", "link", "post_note"]).default("fetch"),
    note: z.string().optional(),
  })
  .refine((v) => v.action !== "link" || !!v.forth_crm_id, { message: "link requires forth_crm_id" })
  .refine((v) => v.action !== "post_note" || !!v.note, { message: "post_note requires note" });

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
  const { client_id, forth_crm_id, action, note } = parsed.data;

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

    // link mode: just persist the known forth_crm_id locally (no Forth call).
    if (action === "link") {
      await supabase.from("clients").update({ forth_crm_id }).eq("id", client_id);
      return jsonResponse(req, { success: true, action, forth_crm_id });
    }

    const crmId = forth_crm_id ?? client.forth_crm_id;
    if (!crmId)
      return jsonResponse(req, { success: false, error: "Client not linked to Forth" }, 409);
    const token = await getAccessToken(client.company_id ?? undefined);
    const headers = buildForthHeaders(token);
    const companyId = client.company_id ?? undefined;

    if (action === "post_note") {
      const payload = { note, category: "system" };
      const resp = await forthFetch(
        `${FORTH}/contacts/${crmId}/notes`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        },
        { caller: "forth-sync-client:note", companyId },
      );
      const result = await resp.json().catch(() => ({}));
      await supabase.from("plsa_sync_log").insert({
        entity_type: "client",
        entity_id: client_id,
        action: "sync",
        provider_id: "forth",
        request_payload: payload,
        response_payload: result,
        success: resp.ok,
        error_message: resp.ok ? null : JSON.stringify(result),
      });
      return jsonResponse(req, { success: resp.ok, action, result }, resp.ok ? 200 : 502);
    }

    // fetch mode
    const resp = await forthFetch(
      `${FORTH}/contacts/${crmId}`,
      { method: "GET", headers },
      {
        caller: "forth-sync-client:fetch",
        companyId,
      },
    );
    const result = await resp.json().catch(() => ({}));
    await supabase.from("plsa_sync_log").insert({
      entity_type: "client",
      entity_id: client_id,
      action: "sync",
      provider_id: "forth",
      response_payload: result,
      success: resp.ok,
      error_message: resp.ok ? null : JSON.stringify(result),
    });
    return jsonResponse(req, { success: resp.ok, action, contact: result }, resp.ok ? 200 : 502);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("forth-sync-client error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
