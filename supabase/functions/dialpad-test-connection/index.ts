// dialpad-test-connection — pings the Dialpad users endpoint and stamps the dialpad integration.
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { resolveCompanyId, markIntegration } from "../_shared/markIntegrationConnected.ts";

const InputSchema = z.object({}).optional();

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  const gate = await requireAuth(req);
  if (gate instanceof Response) return gate;
  InputSchema.safeParse(await req.json().catch(() => ({})));

  const companyId = await resolveCompanyId(req.headers.get("Authorization"));
  try {
    const resp = await fetch("https://dialpad.com/api/v2/users?limit=1", {
      headers: { Authorization: `Bearer ${Deno.env.get("DIALPAD_API_TOKEN")}` },
    });
    const ok = resp.ok;
    await markIntegration(["dialpad"], companyId, {
      success: ok,
      error: ok ? undefined : `HTTP ${resp.status}`,
    });
    if (!ok)
      return jsonResponse(
        req,
        { success: false, error: `Dialpad test failed: ${resp.status}` },
        502,
      );
    const body = await resp.json().catch(() => ({}));
    return jsonResponse(req, {
      success: true,
      user_count: Array.isArray(body.users) ? body.users.length : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await markIntegration(["dialpad"], companyId, { success: false, error: message });
    return jsonResponse(req, { success: false, error: message }, 502);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
