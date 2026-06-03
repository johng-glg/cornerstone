// forth-register-client — one-shot enrollment: create contact → (bank) → debts → enroll, with
// best-effort rollback (DELETE the contact) on any downstream failure so retries don't strand
// orphans (Cornerstone Phase 2F). Writes forth_crm_id locally on success.
// TODO(forth-docs): confirm clients/bank-accounts/debts/enroll endpoints + payloads.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";

const FORTH = "https://api.forthcrm.com/v1";

const InputSchema = z.object({
  client_id: z.string().uuid(),
  client_service_id: z.string().uuid(),
  client_data: z.object({
    first_name: z.string(),
    last_name: z.string(),
    middle_name: z.string().optional(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    email: z.string().email(),
    phone: z.string(),
    date_of_birth: z.string(),
    ssn: z.string().optional(),
  }),
  banking: z
    .object({
      bank_name: z.string(),
      routing_number: z.string(),
      account_number: z.string(),
      account_type: z.enum(["checking", "savings"]),
    })
    .optional(),
  debts: z
    .array(
      z.object({
        creditor_name: z.string(),
        account_type: z.string(),
        current_balance: z.number(),
        original_balance: z.number().optional(),
        account_number: z.string().optional(),
      }),
    )
    .default([]),
});

// deno-lint-ignore no-explicit-any
type Supabase = any;

async function log(
  supabase: Supabase,
  entity_type: string,
  entity_id: string,
  action: string,
  success: boolean,
  request_payload?: unknown,
  response_payload?: unknown,
  error_message?: string,
) {
  try {
    await supabase.from("plsa_sync_log").insert({
      entity_type,
      entity_id,
      action,
      provider_id: "forth",
      success,
      request_payload,
      response_payload,
      error_message,
    });
  } catch (e) {
    console.error("[forth-register-client] log failed:", e);
  }
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  const gate = await requireAuth(req);
  if (gate instanceof Response) return gate;

  const parsed = InputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return jsonResponse(
      req,
      { success: false, error: "Invalid request", issues: parsed.error.issues },
      400,
    );
  }
  const { client_id, client_service_id, client_data, banking, debts } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("company_id")
      .eq("id", client_id)
      .maybeSingle();
    const accessToken = await getAccessToken(clientRow?.company_id ?? undefined);
    const headers = buildForthHeaders(accessToken);

    // Step 1 — create contact (only blocking failure that aborts before any rollback target exists).
    const clientPayload = {
      first_name: client_data.first_name,
      last_name: client_data.last_name,
      middle_name: client_data.middle_name ?? "",
      address: client_data.address,
      city: client_data.city,
      state: client_data.state,
      zip: client_data.zip,
      email: client_data.email,
      home_phone: client_data.phone,
      date_of_birth: client_data.date_of_birth,
      ssn: client_data.ssn ?? "",
      file_type: "DEBT SETTLEMENT",
    };
    const createResp = await forthFetch(
      `${FORTH}/clients`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(clientPayload),
      },
      { caller: "forth-register-client:create" },
    );
    const createResult = await createResp.json().catch(() => ({}));
    await log(
      supabase,
      "client",
      client_id,
      "create_forth_client",
      createResp.ok,
      { ...clientPayload, ssn: clientPayload.ssn ? "***" : "" },
      createResult,
      createResp.ok ? undefined : `HTTP ${createResp.status}`,
    );
    if (!createResp.ok) {
      return jsonResponse(
        req,
        { success: false, error: `Forth contact create failed: ${createResp.status}` },
        502,
      );
    }
    const forthCrmId = createResult.response?.id ?? createResult.id ?? createResult.data?.id;
    if (!forthCrmId) {
      return jsonResponse(req, { success: false, error: "No client id returned from Forth" }, 502);
    }

    const rollback = async (reason: string) => {
      try {
        const del = await forthFetch(
          `${FORTH}/contacts/${forthCrmId}`,
          { method: "DELETE", headers },
          { caller: "forth-register-client:rollback" },
        );
        await log(
          supabase,
          "client",
          client_id,
          "rollback_forth_client",
          del.ok,
          { forth_crm_id: forthCrmId, reason },
          null,
          del.ok ? undefined : `HTTP ${del.status}`,
        );
      } catch (e) {
        await log(
          supabase,
          "client",
          client_id,
          "rollback_forth_client",
          false,
          { forth_crm_id: forthCrmId, reason },
          null,
          e instanceof Error ? e.message : String(e),
        );
      }
    };

    // Step 2 — bank account (blocking; rolls back contact on failure).
    if (banking) {
      const bankPayload = {
        client_id: Number(forthCrmId),
        bank_name: banking.bank_name,
        routing_number: banking.routing_number,
        account_number: banking.account_number,
        account_type: banking.account_type.toUpperCase(),
      };
      const bankResp = await forthFetch(
        `${FORTH}/bank-accounts`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(bankPayload),
        },
        { caller: "forth-register-client:bank" },
      );
      const bankResult = await bankResp.json().catch(() => ({}));
      await log(
        supabase,
        "client",
        client_id,
        "add_bank_account",
        bankResp.ok,
        { ...bankPayload, account_number: "****", routing_number: "****" },
        bankResult,
        bankResp.ok ? undefined : `HTTP ${bankResp.status}`,
      );
      if (!bankResp.ok) {
        await rollback(`bank account failed: HTTP ${bankResp.status}`);
        return jsonResponse(
          req,
          { success: false, error: "Bank account registration failed", rolled_back: true },
          502,
        );
      }
    }

    // Step 3 — debts (blocking; any failure rolls back).
    const debtFailures: string[] = [];
    for (const debt of debts) {
      const debtPayload = {
        client_id: Number(forthCrmId),
        creditor_name: debt.creditor_name,
        account_type: debt.account_type,
        current_balance: debt.current_balance,
        original_balance: debt.original_balance ?? debt.current_balance,
        account_number: debt.account_number ?? "",
      };
      const debtResp = await forthFetch(
        `${FORTH}/debts`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(debtPayload),
        },
        { caller: "forth-register-client:debt" },
      );
      const debtResult = await debtResp.json().catch(() => ({}));
      await log(
        supabase,
        "client_service",
        client_service_id,
        "add_debt",
        debtResp.ok,
        debtPayload,
        debtResult,
        debtResp.ok ? undefined : `HTTP ${debtResp.status}`,
      );
      if (!debtResp.ok) debtFailures.push(debt.creditor_name);
    }
    if (debtFailures.length > 0) {
      await rollback(`${debtFailures.length} debt(s) failed`);
      return jsonResponse(
        req,
        {
          success: false,
          error: `Failed to register ${debtFailures.length} debt(s)`,
          failures: debtFailures,
          rolled_back: true,
        },
        502,
      );
    }

    // Step 4 — enroll (blocking; rolls back on failure).
    const enrollResp = await forthFetch(
      `${FORTH}/clients/${forthCrmId}/enroll`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      },
      { caller: "forth-register-client:enroll" },
    );
    const enrollResult = await enrollResp.json().catch(() => ({}));
    await log(
      supabase,
      "client",
      client_id,
      "enroll_client",
      enrollResp.ok,
      { forth_crm_id: forthCrmId },
      enrollResult,
      enrollResp.ok ? undefined : `HTTP ${enrollResp.status}`,
    );
    if (!enrollResp.ok) {
      await rollback(`enrollment failed: HTTP ${enrollResp.status}`);
      return jsonResponse(
        req,
        { success: false, error: "Enrollment failed", rolled_back: true },
        502,
      );
    }

    // Persist the link. If this fails, the Forth side is enrolled — surface a warning to relink.
    const { error: updErr } = await supabase
      .from("clients")
      .update({ forth_crm_id: String(forthCrmId) })
      .eq("id", client_id);
    if (updErr) {
      return jsonResponse(req, {
        success: true,
        forth_crm_id: String(forthCrmId),
        warning: "Registered with Forth but failed to save forth_crm_id locally — link manually.",
      });
    }
    return jsonResponse(req, { success: true, forth_crm_id: String(forthCrmId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("forth-register-client error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
