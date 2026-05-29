// PLSA Routing — canonical entry point for all PLSA (Personal Litigation Savings Account)
// operations. Resolves the provider for the request and dispatches to the provider-specific
// edge function. Preserves the ADR-009 adapter abstraction exactly.
//
// Pure logic (schema, provider registry, resolvers) lives in ./logic.ts and is unit-tested;
// this module is the supabase-js + auth + HTTP wiring.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  RouteRequestSchema,
  resolveProviderId,
  resolveRoute,
  type ProviderLookups,
} from "./logic.ts";

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

function lookupsFromSupabase(supabase: SupabaseClient): ProviderLookups {
  const one = async (table: string, col: string, val: string, orderByCreated = false) => {
    let q = supabase.from(table).select("plsa_provider_id").eq(col, val);
    if (orderByCreated) q = q.order("created_at", { ascending: false }).limit(1);
    const { data } = await q.maybeSingle();
    return (data?.plsa_provider_id as string | undefined) ?? null;
  };
  return {
    byClientService: (id) => one("client_services", "id", id),
    byTransaction: (id) => one("transactions", "id", id),
    byClient: (id) => one("client_services", "primary_client_id", id, true),
  };
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  try {
    const gate = await requireAuth(req);
    if (gate instanceof Response) return gate;

    const parsed = RouteRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonResponse(
        req,
        { success: false, error: "Invalid request", issues: parsed.error.issues },
        400,
      );
    }
    const body = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const providerId = await resolveProviderId(body, lookupsFromSupabase(supabase));
    const route = resolveRoute(providerId, body.operation);
    if (!route) {
      return jsonResponse(
        req,
        {
          success: false,
          provider_id: providerId,
          error: `Operation '${body.operation}' not supported by provider '${providerId}'`,
        },
        400,
      );
    }

    // Forward the validated caller's auth header downstream — never silently escalate.
    const upstream = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${route.fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: gate.authHeader },
      body: JSON.stringify(route.buildBody(body)),
    });
    const text = await upstream.text();
    let providerResponse: Record<string, unknown> = {};
    try {
      providerResponse = text ? JSON.parse(text) : {};
    } catch {
      providerResponse = { raw: text };
    }
    return jsonResponse(req, { ...providerResponse, provider_id: providerId }, upstream.status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("plsa-routing error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
