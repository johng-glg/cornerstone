// forth-test-connection — force a fresh Forth OAuth and stamp both forth_pay + forth_crm rows
// (shared credentials). No new secrets required.
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAccessToken, clearTokenCache } from "../_shared/forthAuth.ts";
import { resolveCompanyId, markIntegration } from "../_shared/markIntegrationConnected.ts";

const InputSchema = z.object({}).optional();

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  const gate = await requireAuth(req);
  if (gate instanceof Response) return gate;
  InputSchema.safeParse(await req.json().catch(() => ({})));

  const companyId = await resolveCompanyId(req.headers.get("Authorization"));
  try {
    clearTokenCache(companyId);
    const token = await getAccessToken(companyId);
    await markIntegration(["forth_pay", "forth_crm"], companyId, { success: true });
    return jsonResponse(req, { success: true, tokenPreview: `${token.substring(0, 8)}...` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await markIntegration(["forth_pay", "forth_crm"], companyId, {
      success: false,
      error: message,
    });
    return jsonResponse(req, { success: false, error: message }, 502);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
