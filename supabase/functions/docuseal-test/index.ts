// docuseal-test — pings the DocuSeal API and stamps the docuseal integration.
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
    const resp = await fetch("https://api.docuseal.com/templates?limit=1", {
      headers: { "X-Auth-Token": Deno.env.get("DOCUSEAL_API_TOKEN") ?? "" },
    });
    const ok = resp.ok;
    await markIntegration(["docuseal"], companyId, {
      success: ok,
      error: ok ? undefined : `HTTP ${resp.status}`,
    });
    return jsonResponse(req, { success: ok }, ok ? 200 : 502);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await markIntegration(["docuseal"], companyId, { success: false, error: message });
    return jsonResponse(req, { success: false, error: message }, 502);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
