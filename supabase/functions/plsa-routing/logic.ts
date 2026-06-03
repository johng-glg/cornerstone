// PLSA routing — pure logic (Zod schema, provider registry, resolvers). Imports ONLY Zod so it
// can be unit-tested under `deno test` without pulling the supabase-js type graph (which drags in
// Node types). The HTTP/server wiring + supabase client live in index.ts.
import { z } from "npm:zod@3.23.8";

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

export interface RouteEntry {
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
