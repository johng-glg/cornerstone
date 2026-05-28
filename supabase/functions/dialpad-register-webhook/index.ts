// Admin-only: register the Dialpad webhook + call-event subscription via Dialpad API.
// POST {} (no body needed) — returns the created webhook + subscription IDs.
//
// Run this once per environment after the DIALPAD_API_KEY and DIALPAD_WEBHOOK_SECRET
// are configured. Safe to re-run: existing matching webhook/subscription are detected
// and reused.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DIALPAD_API_KEY = Deno.env.get("DIALPAD_API_KEY")!;
const DIALPAD_WEBHOOK_SECRET = Deno.env.get("DIALPAD_WEBHOOK_SECRET")!;
const DIALPAD_BASE = "https://dialpad.com/api/v2";

const HOOK_URL = `${SUPABASE_URL}/functions/v1/dialpad-webhook`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return j({ error: "admin role required" }, 403);

    // 1) Find or create the webhook (matched by hook_url).
    const listResp = await fetch(`${DIALPAD_BASE}/webhooks?limit=100`, {
      headers: { Authorization: `Bearer ${DIALPAD_API_KEY}` },
    });
    const listJson = await listResp.json().catch(() => ({}));
    if (!listResp.ok) return j({ error: "Failed to list webhooks", details: listJson }, 502);

    const existing = (listJson.items ?? []).find((w: any) => w.hook_url === HOOK_URL);
    let webhookId: string | number | null = existing?.id ?? null;

    if (!webhookId) {
      const createResp = await fetch(`${DIALPAD_BASE}/webhooks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DIALPAD_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hook_url: HOOK_URL,
          secret: DIALPAD_WEBHOOK_SECRET,
        }),
      });
      const createJson = await createResp.json().catch(() => ({}));
      if (!createResp.ok) return j({ error: "Failed to create webhook", details: createJson }, 502);
      webhookId = createJson.id;
    }

    // 2) Find or create the call event subscription.
    const subListResp = await fetch(
      `${DIALPAD_BASE}/subscriptions/call?limit=100`,
      { headers: { Authorization: `Bearer ${DIALPAD_API_KEY}` } },
    );
    const subListJson = await subListResp.json().catch(() => ({}));
    if (!subListResp.ok) {
      return j({
        error: "Failed to list call subscriptions",
        details: subListJson,
        webhook_id: webhookId,
      }, 502);
    }

    const existingSub = (subListJson.items ?? []).find(
      (s: any) => String(s.webhook_id) === String(webhookId),
    );
    let subscriptionId: string | number | null = existingSub?.id ?? null;

    if (!subscriptionId) {
      const subResp = await fetch(`${DIALPAD_BASE}/subscriptions/call`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DIALPAD_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook_id: webhookId,
          // Subscribe to all call lifecycle events; Dialpad will deliver
          // ringing, connected, hangup, voicemail, etc.
          enabled: true,
          call_states: ["all"],
        }),

        }),
      });
      const subJson = await subResp.json().catch(() => ({}));
      if (!subResp.ok) {
        return j({
          error: "Failed to create call subscription",
          details: subJson,
          webhook_id: webhookId,
        }, 502);
      }
      subscriptionId = subJson.id;
    }

    return j({
      ok: true,
      webhook_id: webhookId,
      subscription_id: subscriptionId,
      hook_url: HOOK_URL,
      reused_webhook: !!existing,
      reused_subscription: !!existingSub,
    });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
