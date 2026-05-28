// Initiate an outbound Dialpad call for the authenticated staff user.
// POST { target_phone, related_entity_type?, related_entity_id? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationConfig, logIntegrationEvent } from "../_shared/integrations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DIALPAD_API_KEY = Deno.env.get("DIALPAD_API_KEY")!;
const DIALPAD_BASE = "https://dialpad.com/api/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const t0 = Date.now();

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: staff } = await admin
      .from("staff")
      .select("id, company_id, dialpad_user_id")
      .eq("user_id", user.id)
      .single();
    if (!staff) return json({ error: "staff record not found" }, 403);
    if (!staff.dialpad_user_id) return json({ error: "Your Dialpad user is not linked. Ask an admin to backfill." }, 400);

    const body = await req.json().catch(() => ({}));
    const targetPhone = String(body.target_phone ?? "").trim();
    if (!targetPhone) return json({ error: "target_phone required" }, 400);
    const relatedEntityType = body.related_entity_type ?? null;
    const relatedEntityId = body.related_entity_id ?? null;

    const cfg = await getIntegrationConfig(staff.company_id, "dialpad");
    if (!cfg || !cfg.is_enabled) return json({ error: "Dialpad integration disabled" }, 400);

    // Initiate call via Dialpad ringback API
    const resp = await fetch(`${DIALPAD_BASE}/call`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIALPAD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: staff.dialpad_user_id,
        phone_number: targetPhone,
        custom_data: JSON.stringify({
          staff_id: staff.id,
          company_id: staff.company_id,
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId,
        }),
      }),
    });

    const payload = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      await logIntegrationEvent({
        companyId: staff.company_id,
        providerKey: "dialpad",
        eventType: "call.initiate",
        direction: "outbound",
        success: false,
        errorMessage: `Dialpad ${resp.status}: ${JSON.stringify(payload)}`,
        latencyMs: Date.now() - t0,
        payload: { target_phone: targetPhone },
      });
      return json({ error: "Dialpad rejected the call", details: payload }, 502);
    }

    const dialpadCallId = String(payload.call_id ?? payload.id ?? crypto.randomUUID());

    await admin.from("dialpad_calls").insert({
      company_id: staff.company_id,
      dialpad_call_id: dialpadCallId,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      initiated_by: staff.id,
      target_phone: targetPhone,
      direction: "outbound",
      state: "initiated",
      started_at: new Date().toISOString(),
      raw: payload,
    });

    await logIntegrationEvent({
      companyId: staff.company_id,
      providerKey: "dialpad",
      eventType: "call.initiate",
      direction: "outbound",
      success: true,
      entityType: relatedEntityType,
      entityId: relatedEntityId,
      latencyMs: Date.now() - t0,
      payload: { dialpad_call_id: dialpadCallId, target_phone: targetPhone },
    });

    return json({ ok: true, dialpad_call_id: dialpadCallId });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("dialpad-initiate error", msg);
    return json({ error: msg }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
