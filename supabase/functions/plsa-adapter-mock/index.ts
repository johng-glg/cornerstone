// PLSA mock adapter — implements every canonical ADR-009 operation with realistic-shaped,
// side-effect-free responses. Selected when a client_service's plsa_provider_id = 'mock'.
// Pure logic (schema + response shapes) lives in ./logic.ts; this is the auth + HTTP wiring.
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { MockInputSchema, mockResponse } from "./logic.ts";

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  const gate = await requireAuth(req);
  if (gate instanceof Response) return gate;

  const parsed = MockInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return jsonResponse(
      req,
      { success: false, error: "Invalid request", issues: parsed.error.issues },
      400,
    );
  }
  return jsonResponse(req, mockResponse(parsed.data.operation));
}

if (import.meta.main) {
  Deno.serve(handler);
}
