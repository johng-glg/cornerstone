// dialpad-initiate — click-to-call. Requires the dialpad integration enabled + the caller's
// staff.dialpad_user_id; rings the staff device and records a queued dialpad_calls row.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireIntegrationEnabled, logIntegrationEvent } from "../_shared/integrations.ts";

const InputSchema = z.object({
  phone: z.string().min(3),
  related_entity_type: z.string().optional(),
  related_entity_id: z.string().uuid().optional(),
});

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  const gate = await requireAuth(req);
  if (gate instanceof Response) return gate;

  // Click-to-call places real outbound calls via Dialpad; cap per-user request rate.
  const limited = await enforceRateLimit(req, {
    bucket: "dialpad-initiate",
    identifier: gate.userId ?? "service",
    maxRequests: 20,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const parsed = InputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return jsonResponse(
      req,
      { success: false, error: "Invalid request", issues: parsed.error.issues },
      400,
    );
  }
  const { phone, related_entity_type, related_entity_id } = parsed.data;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  try {
    const { data: staff } = await admin
      .from("staff")
      .select("id, company_id, dialpad_user_id")
      .eq("user_id", gate.userId)
      .maybeSingle();
    if (!staff) return jsonResponse(req, { success: false, error: "Staff profile not found" }, 403);
    await requireIntegrationEnabled(staff.company_id, "dialpad");
    if (!staff.dialpad_user_id) {
      return jsonResponse(
        req,
        { success: false, error: "Your account is not linked to Dialpad" },
        409,
      );
    }

    const resp = await fetch("https://dialpad.com/api/v2/call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("DIALPAD_API_TOKEN")}`,
      },
      body: JSON.stringify({
        user_id: staff.dialpad_user_id,
        phone_number: phone,
        custom_data: {
          related_entity_type,
          related_entity_id,
          company_id: staff.company_id,
          staff_id: staff.id,
        },
      }),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      await logIntegrationEvent({
        companyId: staff.company_id,
        providerKey: "dialpad",
        eventType: "outbound_call_initiated",
        direction: "outbound",
        success: false,
        errorMessage: `${resp.status}`,
      });
      return jsonResponse(
        req,
        { success: false, error: `Dialpad call failed: ${resp.status}` },
        502,
      );
    }
    const dialpadCallId = String(body.call_id ?? body.id ?? "");
    await admin.from("dialpad_calls").insert({
      company_id: staff.company_id,
      dialpad_call_id: dialpadCallId,
      related_entity_type: related_entity_type ?? null,
      related_entity_id: related_entity_id ?? null,
      initiated_by: staff.id,
      target_phone: phone,
      direction: "outbound",
      state: "queued",
      raw: body,
    });
    await logIntegrationEvent({
      companyId: staff.company_id,
      providerKey: "dialpad",
      eventType: "outbound_call_initiated",
      direction: "outbound",
      entityType: related_entity_type ?? null,
      entityId: related_entity_id ?? null,
      success: true,
    });
    return jsonResponse(req, { success: true, dialpad_call_id: dialpadCallId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("dialpad-initiate error:", message);
    return jsonResponse(
      req,
      { success: false, error: message },
      message.startsWith("Integration disabled") ? 409 : 500,
    );
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
