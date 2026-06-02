// dialpad-register-webhook — one-time setup. Dialpad webhooks can only be created via the API
// (no dashboard UI), so this admin-invoked function uses DIALPAD_API_TOKEN to:
//   1. create a webhook pointing at our dialpad-webhook receiver, signed with
//      DIALPAD_WEBHOOK_SECRET (→ HS256 JWT-signed deliveries), then
//   2. create a call-event subscription bound to that webhook.
// Secrets stay server-side (read from the function env). Returns the webhook + subscription ids.
//
// Idempotent: re-running reuses the existing webhook/subscription (handles Dialpad 409s) and
// refreshes the webhook secret, so it's safe to click again. Requires an authenticated caller
// (requireAuth) and is rate-limited.
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const DIALPAD_API = "https://dialpad.com/api/v2";

// Optional overrides; defaults subscribe to all call states.
const InputSchema = z
  .object({
    call_states: z.array(z.string()).optional(),
    group_calls: z.boolean().optional(),
  })
  .partial();

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const gate = await requireAuth(req);
  if (gate instanceof Response) return gate;

  const limited = await enforceRateLimit(req, {
    bucket: "dialpad-register-webhook",
    identifier: gate.userId ?? "service",
    maxRequests: 5,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const parsed = InputSchema.safeParse(await req.json().catch(() => ({})));
  const input = parsed.success ? parsed.data : {};

  const apiToken = Deno.env.get("DIALPAD_API_TOKEN") ?? "";
  const secret = Deno.env.get("DIALPAD_WEBHOOK_SECRET") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!apiToken || !secret || !supabaseUrl) {
    return jsonResponse(
      req,
      {
        success: false,
        error:
          "Missing DIALPAD_API_TOKEN, DIALPAD_WEBHOOK_SECRET, or SUPABASE_URL in the function environment.",
      },
      400,
    );
  }

  const hookUrl = `${supabaseUrl}/functions/v1/dialpad-webhook`;
  const headers = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };

  // deno-lint-ignore no-explicit-any
  const items = (b: any): any[] =>
    b?.items ?? b?.webhooks ?? b?.subscriptions ?? (Array.isArray(b) ? b : []);

  try {
    // 1. Create the webhook (secret → HS256 JWT-signed deliveries). Idempotent: if one already
    //    exists for this hook_url (409), reuse it and refresh its secret so JWT verification matches.
    let webhookId: string | undefined;
    let reused = false;
    const whResp = await fetch(`${DIALPAD_API}/webhooks`, {
      method: "POST",
      headers,
      body: JSON.stringify({ hook_url: hookUrl, secret }),
    });
    const whBody = await whResp.json().catch(() => ({}));
    if (whResp.ok) {
      webhookId = whBody.id ?? whBody.webhook_id;
    } else if (whResp.status === 409) {
      reused = true;
      const listResp = await fetch(`${DIALPAD_API}/webhooks`, { headers });
      const existing = items(await listResp.json().catch(() => ({}))).find(
        (w) => w.hook_url === hookUrl,
      );
      webhookId = existing?.id ?? existing?.webhook_id;
      // Best-effort: ensure the existing webhook uses the current secret.
      if (webhookId) {
        await fetch(`${DIALPAD_API}/webhooks/${webhookId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ secret }),
        }).catch(() => {});
      }
    }
    if (!webhookId) {
      return jsonResponse(
        req,
        { success: false, step: "create_webhook", status: whResp.status, error: whBody },
        502,
      );
    }

    // 2. Call-event subscription. Company-level (no target) call subscriptions are capped at 10
    //    per type by Dialpad, and POSTing doesn't dedupe — so repeated runs piled up duplicates and
    //    hit the cap. Self-heal: delete every existing call subscription pointing at our webhook,
    //    then create exactly one.
    const subWhId = String(webhookId);
    const existingSubs = items(
      await (await fetch(`${DIALPAD_API}/subscriptions/call`, { headers }))
        .json()
        .catch(() => ({})),
    ).filter(
      (s) =>
        String(s.webhook_id ?? s.webhook?.id ?? "") === subWhId ||
        (s.hook_url ?? s.webhook?.hook_url) === hookUrl,
    );
    let removed = 0;
    for (const s of existingSubs) {
      if (!s.id) continue;
      const del = await fetch(`${DIALPAD_API}/subscriptions/call/${s.id}`, {
        method: "DELETE",
        headers,
      }).catch(() => null);
      if (del?.ok) removed++;
    }

    const subPayload: Record<string, unknown> = { webhook_id: webhookId, enabled: true };
    if (input.call_states?.length) subPayload.call_states = input.call_states;
    if (typeof input.group_calls === "boolean") subPayload.group_calls = input.group_calls;
    const subResp = await fetch(`${DIALPAD_API}/subscriptions/call`, {
      method: "POST",
      headers,
      body: JSON.stringify(subPayload),
    });
    const subBody = await subResp.json().catch(() => ({}));
    if (!subResp.ok) {
      return jsonResponse(
        req,
        {
          success: false,
          step: "create_subscription",
          status: subResp.status,
          error: subBody,
          webhook_id: webhookId,
          removed_stale_subscriptions: removed,
        },
        502,
      );
    }

    return jsonResponse(req, {
      success: true,
      reused_existing_webhook: reused,
      removed_stale_subscriptions: removed,
      hook_url: hookUrl,
      webhook_id: webhookId,
      subscription_id: subBody.id ?? subBody.subscription_id ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse(req, { success: false, error: message }, 502);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
