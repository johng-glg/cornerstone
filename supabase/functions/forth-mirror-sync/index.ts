// forth-mirror-sync — Forth -> mirror sync for the settlement forecasting engine (spec §3, §6, §8).
//
// For each requested client it: resolves the Forth contact id + company_id (clients.forth_crm_id /
// company_id), pulls the contact's transactions and settlement offers from Forth REST (reusing the
// shared forthFetch/auth), upserts them into forth_transaction / settlement_offer / settlement_payment
// / settlement_fee, then recomputes the Mode-B projection (fn_project_verdict), persists it to
// projection_run, and reconciles forecast_alert (spec §8). Idempotent: re-running re-upserts by
// natural key and re-derives alerts.
//
// TODO(forth-docs): confirm the per-contact transactions endpoint + response envelope. The repo's
// only existing transactions call (forth-poll-transactions) is draft-scoped and likewise flagged;
// this uses GET contacts/{id}/transactions with defensive envelope/field unwrapping until confirmed.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";
import {
  FORTHCRM,
  mapForthTransaction,
  mapSettlementOffer,
  type ForthTransactionRow,
  type MappedOffer,
  type Raw,
} from "../_shared/forecastSync.ts";
import { deriveAlerts, reconcileAlerts, type Verdict } from "../_shared/forecastAlerts.ts";

const InputSchema = z
  .object({
    client_id: z.string().uuid().optional(),
    client_ids: z.array(z.string().uuid()).optional(),
    horizon_days: z.number().int().positive().optional(),
  })
  .refine((v) => v.client_id || (v.client_ids?.length ?? 0) > 0, {
    message: "client_id or client_ids[] is required",
  });

// deno-lint-ignore no-explicit-any
type Supabase = any;

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Defensively unwrap Forth's varied list envelopes into an array. */
function asList(result: Raw): Raw[] {
  if (Array.isArray(result)) return result;
  return (
    result?.response?.transactions ??
    result?.transactions ??
    result?.response?.data ??
    result?.data ??
    result?.items ??
    []
  );
}

async function getJson(
  url: string,
  headers: Record<string, string>,
  companyId: string,
): Promise<Raw> {
  const resp = await forthFetch(
    url,
    { method: "GET", headers },
    { caller: "forth-mirror-sync", companyId },
  );
  if (!resp.ok) {
    if (resp.status === 404) return null;
    throw new Error(`Forth GET ${url} -> ${resp.status}`);
  }
  return await resp.json().catch(() => null);
}

async function getConfigNumber(supabase: Supabase, key: string, fallback: number): Promise<number> {
  const { data } = await supabase
    .from("system_setting")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  const n = data?.value != null ? Number(data.value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/** Fetch + map a contact's transactions, settlement offers, and their payment/fee schedules. */
async function fetchContactData(
  forthId: number,
  companyId: string,
  headers: Record<string, string>,
  defaultFeeRate: number,
): Promise<{ transactions: ForthTransactionRow[]; offers: MappedOffer[] }> {
  const txRaw = asList(
    await getJson(`${FORTHCRM}/contacts/${forthId}/transactions`, headers, companyId),
  );
  const transactions = txRaw
    .map((t: Raw) => mapForthTransaction(t, companyId, forthId))
    .filter((r): r is ForthTransactionRow => r !== null);

  // Offers: enrolled debts -> each debt's settlement offers.
  const offers: MappedOffer[] = [];
  const debts = asList(
    await getJson(`${FORTHCRM}/contacts/${forthId}/debts/enrolled`, headers, companyId),
  );
  for (const d of debts) {
    const debtId = d?.id ?? d?.debt_id;
    if (debtId == null) continue;
    const offerRaw = asList(
      await getJson(`${FORTHCRM}/debts/${debtId}/settlement_offers`, headers, companyId),
    );
    for (const o of offerRaw) {
      const mapped = mapSettlementOffer(o, companyId, forthId, defaultFeeRate);
      if (mapped) offers.push(mapped);
    }
  }
  return { transactions, offers };
}

/** Recompute the Mode-B projection, persist projection_run, and reconcile forecast_alert. */
async function refreshProjection(
  supabase: Supabase,
  contactId: number,
  companyId: string,
  horizonDays: number,
): Promise<{ breach: boolean; alerts_opened: number; alerts_resolved: number }> {
  const { data, error } = await supabase.rpc("fn_project_verdict", {
    p_contact_id: contactId,
    p_prospective_offer_ids: null,
    p_floor: null,
    p_incidental: null,
  });
  if (error) throw new Error(error.message);
  const verdict = (Array.isArray(data) ? data[0] : data) as Verdict | null;
  if (!verdict) return { breach: false, alerts_opened: 0, alerts_resolved: 0 };

  await supabase.from("projection_run").upsert(
    {
      contact_id: contactId,
      company_id: companyId,
      min_balance: verdict.min_balance,
      breach: verdict.breach ?? false,
      additional_needed: verdict.additional_needed,
      headroom: verdict.headroom,
      breach_date: verdict.breach_date,
      start_date: verdict.start_date,
      payload: verdict,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "contact_id" },
  );

  const desired = deriveAlerts(verdict, contactId, companyId, todayISO(), horizonDays);
  const { data: openRows } = await supabase
    .from("forecast_alert")
    .select("id, threatened_offer_id, breach_date")
    .eq("contact_id", contactId)
    .eq("status", "open");
  const { toUpsert, toResolveIds } = reconcileAlerts(desired, openRows ?? []);

  if (toUpsert.length) {
    await supabase.from("forecast_alert").upsert(
      toUpsert.map((a) => ({ ...a, updated_at: new Date().toISOString() })),
      {
        onConflict: "contact_id,threatened_offer_id,breach_date",
      },
    );
  }
  if (toResolveIds.length) {
    await supabase
      .from("forecast_alert")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", toResolveIds);
  }
  return {
    breach: verdict.breach ?? false,
    alerts_opened: toUpsert.length,
    alerts_resolved: toResolveIds.length,
  };
}

async function syncClient(
  supabase: Supabase,
  client: { id: string; company_id: string; forth_crm_id: string },
  horizonDays: number,
  defaultFeeRate: number,
) {
  const forthId = Number(client.forth_crm_id);
  if (!Number.isFinite(forthId))
    throw new Error(`client ${client.id} has non-numeric forth_crm_id`);
  const token = await getAccessToken(client.company_id);
  const headers = buildForthHeaders(token);

  const { transactions, offers } = await fetchContactData(
    forthId,
    client.company_id,
    headers,
    defaultFeeRate,
  );

  if (transactions.length) {
    const { error } = await supabase.from("forth_transaction").upsert(
      transactions.map((t) => ({ ...t, synced_at: new Date().toISOString() })),
      { onConflict: "id" },
    );
    if (error) throw new Error(`forth_transaction upsert: ${error.message}`);
  }
  for (const m of offers) {
    const { error: oErr } = await supabase
      .from("settlement_offer")
      .upsert({ ...m.offer, updated_at: new Date().toISOString() }, { onConflict: "offer_id" });
    if (oErr) throw new Error(`settlement_offer upsert: ${oErr.message}`);
    if (m.payments.length) {
      await supabase.from("settlement_payment").upsert(m.payments, { onConflict: "offer_id,seq" });
    }
    if (m.fees.length) {
      await supabase.from("settlement_fee").upsert(m.fees, { onConflict: "offer_id,seq" });
    }
  }

  const projection = await refreshProjection(supabase, forthId, client.company_id, horizonDays);

  await supabase.from("plsa_sync_log").insert({
    entity_type: "forth_transaction",
    entity_id: client.id,
    action: "sync",
    provider_id: "forth",
    success: true,
    response_payload: {
      forth_contact_id: forthId,
      transactions: transactions.length,
      offers: offers.length,
      ...projection,
    },
  });

  return {
    client_id: client.id,
    forth_contact_id: forthId,
    transactions: transactions.length,
    offers: offers.length,
    ...projection,
  };
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  const gate = await requireAuth(req);
  if (gate instanceof Response) return gate;

  const parsed = InputSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return jsonResponse(
      req,
      { success: false, error: "Invalid request", issues: parsed.error.issues },
      400,
    );
  }
  const ids = parsed.data.client_ids ?? [parsed.data.client_id!];

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const horizonDays =
    parsed.data.horizon_days ?? (await getConfigNumber(supabase, "alert_horizon_days", 45));
  const defaultFeeRate = await getConfigNumber(supabase, "default_fee_rate", 0.27);

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, company_id, forth_crm_id")
    .in("id", ids);
  if (error) return jsonResponse(req, { success: false, error: error.message }, 500);

  const results = [];
  const errors = [];
  for (const c of clients ?? []) {
    if (!c.forth_crm_id || !c.company_id) {
      errors.push({ client_id: c.id, error: "missing forth_crm_id or company_id" });
      continue;
    }
    try {
      results.push(await syncClient(supabase, c, horizonDays, defaultFeeRate));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[forth-mirror-sync] client ${c.id}:`, message);
      errors.push({ client_id: c.id, error: message });
      await supabase.from("plsa_sync_log").insert({
        entity_type: "forth_transaction",
        entity_id: c.id,
        action: "sync",
        provider_id: "forth",
        success: false,
        error_message: message,
      });
    }
  }

  return jsonResponse(req, {
    success: errors.length === 0,
    synced: results.length,
    results,
    errors,
  });
}

if (import.meta.main) {
  Deno.serve(handler);
}
