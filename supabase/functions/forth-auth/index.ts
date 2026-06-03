// forth-auth — diagnostic endpoint exercising the shared Forth OAuth helper.
// Real callers import getAccessToken from _shared/forthAuth.ts directly. Optional company_id
// exercises per-tenant credential lookup.
import { z } from "npm:zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAccessToken } from "../_shared/forthAuth.ts";

const InputSchema = z.object({ company_id: z.string().uuid().optional() }).optional();

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const gate = await requireAuth(req);
  if (gate instanceof Response) return gate;

  // Token mint against Forth's OAuth endpoint; cap per-user to protect the upstream credential.
  const limited = await enforceRateLimit(req, {
    bucket: "forth-auth",
    identifier: gate.userId ?? "service",
    maxRequests: 15,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const raw = await req.json().catch(() => ({}));
  const parsed = InputSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return jsonResponse(
      req,
      { success: false, error: "Invalid request", issues: parsed.error.issues },
      400,
    );
  }
  const companyId = parsed.data?.company_id;

  try {
    const token = await getAccessToken(companyId);
    return jsonResponse(req, {
      success: true,
      message: "Authentication successful",
      tokenPreview: `${token.substring(0, 10)}...`,
      company_id: companyId ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("forth-auth error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
