// PLSA Adapter Mock — Phase 4B
// Returns canned, realistic-shape responses for every canonical PLSA operation.
// Used for development / testing when a real provider is not yet sandbox-available.
// No real-world side effects.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isoNow() {
  return new Date().toISOString();
}

function mockId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

const HANDLERS: Record<string, (body: Record<string, unknown>) => Record<string, unknown>> = {
  auth_test: () => ({ success: true, tokenPreview: "mock_***************abcd", message: "Mock auth OK" }),

  register_client: () => ({
    success: true,
    forth_crm_id: mockId("mockcrm"),
    message: "Mock client registered",
  }),

  sync_client: (b) => ({
    success: true,
    forth_crm_id: (b.client_id as string) ? mockId("mockcrm") : undefined,
    contact: { id: mockId("mockcontact"), status: "active", updated_at: isoNow() },
  }),

  fetch_balance: () => {
    const balance = Math.round(Math.random() * 500000) / 100;
    return {
      success: true,
      balance,
      balance_cents: Math.round(balance * 100),
      as_of_timestamp: isoNow(),
      source: "mock",
      local_projection: balance,
      drift_detected: false,
    };
  },

  contact_update: (b) => {
    const updates = (b.updates ?? (b.payload as Record<string, unknown> | undefined)?.updates ?? {}) as Record<string, unknown>;
    return {
      success: true,
      updated_fields: Object.keys(updates),
      skipped: Object.keys(updates).length === 0,
    };
  },

  contact_close: () => ({
    success: true,
    forth_status: "closed",
    closed_at: isoNow(),
  }),

  create_draft: () => ({
    success: true,
    draft_id: mockId("mockdraft"),
    message: "Mock draft created",
  }),

  update_draft: (b) => ({
    success: true,
    updated: {
      process_date: (b.process_date as string) ?? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      amount: (b.amount as number) ?? 350,
    },
  }),

  cancel_draft: () => ({ success: true, message: "Mock draft cancelled" }),

  pause_resume: (b) => ({
    success: true,
    action: b.action ?? "pause",
    message: `Mock client ${b.action ?? "paused"}`,
  }),

  poll_transactions: () => ({ success: true, polled: 0, updated: 0, errors: 0 }),

  payment_to_creditor: () => ({
    success: true,
    external_payment_id: mockId("mockpay"),
    scheduled_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    status: "scheduled",
  }),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const operation = (body?.operation as string) ?? "auth_test";
    const handler = HANDLERS[operation];

    if (!handler) {
      return new Response(
        JSON.stringify({ success: false, error: `Mock does not support operation '${operation}'` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = handler(body);
    return new Response(
      JSON.stringify({ ...result, provider_id: "mock" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
