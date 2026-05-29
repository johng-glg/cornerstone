// forth-contact-update — PUT mutable contact fields to Forth CRM. No-ops if not yet linked.
// TODO(forth-docs): confirm PUT vs PATCH + exact field names.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";

const UpdatesSchema = z
  .object({
    first_name: z.string().optional(),
    middle_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  })
  .refine((u) => Object.keys(u).length > 0, { message: "updates payload cannot be empty" });

const InputSchema = z.object({ client_id: z.string().uuid(), updates: UpdatesSchema });

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
  const { client_id, updates } = parsed.data;

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
      return jsonResponse(req, { success: true, skipped: true, reason: "not_linked_to_forth" });
    }

    const token = await getAccessToken(client.company_id ?? undefined);
    const resp = await forthFetch(
      `https://api.forthcrm.com/v1/contacts/${client.forth_crm_id}`,
      { method: "PUT", headers: buildForthHeaders(token), body: JSON.stringify(updates) },
      { caller: "forth-contact-update", companyId: client.company_id ?? undefined },
    );
    const body = await resp.json().catch(() => ({}));
    await supabase.from("plsa_sync_log").insert({
      entity_type: "client",
      entity_id: client_id,
      action: "contact_update",
      provider_id: "forth",
      request_payload: { forth_crm_id: client.forth_crm_id, updates },
      response_payload: body,
      success: resp.ok,
      error_message: resp.ok ? null : `${resp.status}`,
    });
    if (!resp.ok)
      return jsonResponse(
        req,
        { success: false, error: `Forth update failed: ${resp.status}` },
        502,
      );
    return jsonResponse(req, { success: true, updated_fields: Object.keys(updates) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("forth-contact-update error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
