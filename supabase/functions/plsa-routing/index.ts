// PLSA Routing — Phase 4A
// Canonical entry point for all PLSA (Pre-Litigation Settlement Account) operations.
// Dispatches to provider-specific edge function based on plsa_provider_id.
//
// Input:  { operation: string, client_id?, client_service_id?, transaction_id?, settlement_id?, payload? }
// Output: { success, provider_id, ...response }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAuth } from "../_shared/requireAuth.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Operation =
  | "auth_test"
  | "register_client"
  | "sync_client"
  | "fetch_balance"
  | "contact_update"
  | "contact_close"
  | "create_draft"
  | "update_draft"
  | "cancel_draft"
  | "pause_resume"
  | "poll_transactions"
  | "payment_to_creditor";

interface RouteRequest {
  operation: Operation;
  client_id?: string;
  client_service_id?: string;
  transaction_id?: string;
  settlement_id?: string;
  payload?: Record<string, unknown>;
}

// Maps canonical operations → provider-specific edge function names.
// Each provider entry returns { fn, buildBody } so we can normalize payload shapes.
const PROVIDER_REGISTRY: Record<string, Record<Operation, { fn: string; buildBody: (r: RouteRequest) => Record<string, unknown> }>> = {
  forth: {
    auth_test:           { fn: "forth-auth",                  buildBody: () => ({}) },
    register_client:     { fn: "forth-register-client",       buildBody: (r) => ({ ...(r.payload ?? {}) }) },
    sync_client:         { fn: "forth-sync-client",           buildBody: (r) => ({ client_id: r.client_id, ...(r.payload ?? {}) }) },
    fetch_balance:       { fn: "forth-fetch-balance",         buildBody: (r) => ({ client_id: r.client_id }) },
    contact_update:      { fn: "forth-contact-update",        buildBody: (r) => ({ client_id: r.client_id, updates: r.payload?.updates ?? r.payload }) },
    contact_close:       { fn: "forth-contact-close",         buildBody: (r) => ({ client_id: r.client_id, close_reason: r.payload?.close_reason }) },
    create_draft:        { fn: "forth-create-draft",          buildBody: (r) => ({ transaction_id: r.transaction_id }) },
    update_draft:        { fn: "forth-update-draft",          buildBody: (r) => ({ transaction_id: r.transaction_id, ...(r.payload ?? {}) }) },
    cancel_draft:        { fn: "forth-cancel-draft",          buildBody: (r) => ({ transaction_id: r.transaction_id }) },
    pause_resume:        { fn: "forth-pause-resume",          buildBody: (r) => ({ client_id: r.client_id, action: r.payload?.action }) },
    poll_transactions:   { fn: "forth-poll-transactions",     buildBody: () => ({}) },
    payment_to_creditor: { fn: "forth-payment-to-creditor",   buildBody: (r) => ({ settlement_id: r.settlement_id, ...(r.payload ?? {}) }) },
  },
  mock: {
    auth_test:           { fn: "plsa-adapter-mock", buildBody: (r) => ({ operation: r.operation }) },
    register_client:     { fn: "plsa-adapter-mock", buildBody: (r) => ({ operation: r.operation, ...r }) },
    sync_client:         { fn: "plsa-adapter-mock", buildBody: (r) => ({ operation: r.operation, ...r }) },
    fetch_balance:       { fn: "plsa-adapter-mock", buildBody: (r) => ({ operation: r.operation, ...r }) },
    contact_update:      { fn: "plsa-adapter-mock", buildBody: (r) => ({ operation: r.operation, ...r }) },
    contact_close:       { fn: "plsa-adapter-mock", buildBody: (r) => ({ operation: r.operation, ...r }) },
    create_draft:        { fn: "plsa-adapter-mock", buildBody: (r) => ({ operation: r.operation, ...r }) },
    update_draft:        { fn: "plsa-adapter-mock", buildBody: (r) => ({ operation: r.operation, ...r }) },
    cancel_draft:        { fn: "plsa-adapter-mock", buildBody: (r) => ({ operation: r.operation, ...r }) },
    pause_resume:        { fn: "plsa-adapter-mock", buildBody: (r) => ({ operation: r.operation, ...r }) },
    poll_transactions:   { fn: "plsa-adapter-mock", buildBody: (r) => ({ operation: r.operation, ...r }) },
    payment_to_creditor: { fn: "plsa-adapter-mock", buildBody: (r) => ({ operation: r.operation, ...r }) },
  },
};

async function resolveProviderId(
  supabase: ReturnType<typeof createClient>,
  req: RouteRequest,
): Promise<string> {
  // Order of resolution: explicit override in payload → client_service → client's active service → 'forth' default
  const override = (req.payload as Record<string, unknown> | undefined)?.provider_id;
  if (typeof override === "string" && override) return override;

  if (req.client_service_id) {
    const { data } = await supabase
      .from("client_services")
      .select("plsa_provider_id")
      .eq("id", req.client_service_id)
      .maybeSingle();
    if (data?.plsa_provider_id) return data.plsa_provider_id as string;
  }

  if (req.transaction_id) {
    const { data } = await supabase
      .from("transactions")
      .select("plsa_provider_id")
      .eq("id", req.transaction_id)
      .maybeSingle();
    if (data?.plsa_provider_id) return data.plsa_provider_id as string;
  }

  if (req.client_id) {
    const { data } = await supabase
      .from("client_services")
      .select("plsa_provider_id")
      .eq("client_id", req.client_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.plsa_provider_id) return data.plsa_provider_id as string;
  }

  return "forth";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const gate = await requireAuth(req);
    if (gate instanceof Response) return gate;

    const body = (await req.json()) as RouteRequest;
    if (!body?.operation) {
      return new Response(
        JSON.stringify({ success: false, error: "operation is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const providerId = await resolveProviderId(supabase, body);
    const providerMap = PROVIDER_REGISTRY[providerId];
    if (!providerMap) {
      return new Response(
        JSON.stringify({ success: false, provider_id: providerId, error: `Unknown provider: ${providerId}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const route = providerMap[body.operation];
    if (!route) {
      return new Response(
        JSON.stringify({ success: false, provider_id: providerId, error: `Operation '${body.operation}' not supported by provider '${providerId}'` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Forward the validated caller's auth header to the downstream function
    // so it can apply its own auth gate. Never silently fall back to service-role
    // for anonymous callers.
    const fnBody = route.buildBody(body);

    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${route.fn}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: gate.authHeader,
      },
      body: JSON.stringify(fnBody),
    });


    const text = await upstream.text();
    let parsed: Record<string, unknown> = {};
    try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }

    return new Response(
      JSON.stringify({ ...parsed, provider_id: providerId }),
      { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("plsa-routing error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
