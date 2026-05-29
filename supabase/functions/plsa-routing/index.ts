// PLSA Routing — canonical entry point for all PLSA (Personal Litigation Savings Account)
// operations. Resolves the provider for the request and dispatches to the provider-specific
// edge function. Preserves the ADR-009 adapter abstraction exactly.
//
// Input:  { operation, client_id?, client_service_id?, transaction_id?, settlement_id?, payload? }
// Output: { ...providerResponse, provider_id }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

// The 12 canonical operations (ADR-009 §Outbound operations + auth_test/poll/pause).
export const OPERATIONS = [
  "auth_test",
  "register_client",
  "sync_client",
  "fetch_balance",
  "contact_update",
  "contact_close",
  "create_draft",
  "update_draft",
  "cancel_draft",
  "pause_resume",
  "poll_transactions",
  "payment_to_creditor",
] as const;
export type Operation = (typeof OPERATIONS)[number];

export const RouteRequestSchema = z.object({
  operation: z.enum(OPERATIONS),
  client_id: z.string().uuid().optional(),
  client_service_id: z.string().uuid().optional(),
  transaction_id: z.string().uuid().optional(),
  settlement_id: z.string().uuid().optional(),
  payload: z.record(z.unknown()).optional(),
});
export type RouteRequest = z.infer<typeof RouteRequestSchema>;

interface RouteEntry {
  fn: string;
  buildBody: (r: RouteRequest) => Record<string, unknown>;
}

// Maps canonical operations → provider-specific edge function + payload shape.
export const PROVIDER_REGISTRY: Record<string, Record<Operation, RouteEntry>> = {
  forth: {
    auth_test: { fn: "forth-auth", buildBody: () => ({}) },
    register_client: { fn: "forth-register-client", buildBody: (r) => ({ ...(r.payload ?? {}) }) },
    sync_client: {
      fn: "forth-sync-client",
      buildBody: (r) => ({ client_id: r.client_id, ...(r.payload ?? {}) }),
    },
    fetch_balance: { fn: "forth-fetch-balance", buildBody: (r) => ({ client_id: r.client_id }) },
    contact_update: {
      fn: "forth-contact-update",
      buildBody: (r) => ({ client_id: r.client_id, updates: r.payload?.updates ?? r.payload }),
    },
    contact_close: {
      fn: "forth-contact-close",
      buildBody: (r) => ({ client_id: r.client_id, close_reason: r.payload?.close_reason }),
    },
    create_draft: {
      fn: "forth-create-draft",
      buildBody: (r) => ({ transaction_id: r.transaction_id }),
    },
    update_draft: {
      fn: "forth-update-draft",
      buildBody: (r) => ({ transaction_id: r.transaction_id, ...(r.payload ?? {}) }),
    },
    cancel_draft: {
      fn: "forth-cancel-draft",
      buildBody: (r) => ({ transaction_id: r.transaction_id }),
    },
    pause_resume: {
      fn: "forth-pause-resume",
      buildBody: (r) => ({ client_id: r.client_id, action: r.payload?.action }),
    },
    poll_transactions: { fn: "forth-poll-transactions", buildBody: () => ({}) },
    payment_to_creditor: {
      fn: "forth-payment-to-creditor",
      buildBody: (r) => ({ settlement_id: r.settlement_id, ...(r.payload ?? {}) }),
    },
  },
  mock: Object.fromEntries(
    OPERATIONS.map((op) => [
      op,
      {
        fn: "plsa-adapter-mock",
        buildBody: (r: RouteRequest) => ({ operation: r.operation, ...r }),
      },
    ]),
  ) as Record<Operation, RouteEntry>,
};

export interface ProviderLookups {
  byClientService: (id: string) => Promise<string | null>;
  byTransaction: (id: string) => Promise<string | null>;
  byClient: (id: string) => Promise<string | null>;
}

/** Resolve the provider id: explicit override → client_service → transaction → client → 'forth'. */
export async function resolveProviderId(
  req: RouteRequest,
  lookups: ProviderLookups,
): Promise<string> {
  const override = req.payload?.provider_id;
  if (typeof override === "string" && override) return override;
  if (req.client_service_id) {
    const p = await lookups.byClientService(req.client_service_id);
    if (p) return p;
  }
  if (req.transaction_id) {
    const p = await lookups.byTransaction(req.transaction_id);
    if (p) return p;
  }
  if (req.client_id) {
    const p = await lookups.byClient(req.client_id);
    if (p) return p;
  }
  return "forth";
}

/** Resolve the downstream route for a provider+operation, or null if unsupported. */
export function resolveRoute(providerId: string, operation: Operation): RouteEntry | null {
  return PROVIDER_REGISTRY[providerId]?.[operation] ?? null;
}

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
