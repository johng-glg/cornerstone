// forth-import-anonymized — pull real Forth CRM contacts (with their debts + settlement offers)
// into Cornerstone as de-identified clients + engagements + liabilities + settlements. Every PII /
// contact field is replaced with obvious dummy data; the non-PII structure (debt balances, offer
// amounts, payment terms, statuses, dates, creditor names) is preserved.
//
//   Safety: dry_run defaults to TRUE — returns a PII-free preview of what *would* be written,
//           including how many debts/offers were found, which Forth endpoint supplied them, and a
//           PII-masked sample of the raw shape. Re-call with dry_run:false to persist.
//
//   Sources (pick one): contact_ids[] (reliable, GET /contacts/{id}) or list{} (best-effort bulk).
//
// Debts/offers are separate Forth resources (not nested in the contact), so we probe a few likely
// endpoints and report which one worked — TODO(forth-docs): pin these down once confirmed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { buildForthHeaders, forthFetch, getAccessToken } from "../_shared/forthAuth.ts";
import {
  type AnonLiability,
  extractContactId,
  isEnrolledDebt,
  mapContact,
  type MappedContact,
  mapDebts,
  maskPII,
  parseContactList,
  parseList,
  unwrapContact,
} from "../_shared/forthImport.ts";

const FORTH = "https://api.forthcrm.com/v1";

const InputSchema = z
  .object({
    company_id: z.string().uuid(),
    contact_ids: z
      .array(z.union([z.string(), z.number()]))
      .max(500)
      .optional(),
    list: z
      .object({
        limit: z.number().int().min(1).max(200).default(25),
        page: z.number().int().min(1).default(1),
      })
      .optional(),
    hydrate: z.boolean().default(true),
    include_debts: z.boolean().default(true),
    include_offers: z.boolean().default(true),
    update_existing: z.boolean().default(true), // re-import updates existing records (vs. skip)
    dry_run: z.boolean().default(true),
    default_plan_type: z.enum(["glg_standard", "glg_adjustable", "glg_exception"]).optional(),
  })
  .refine((v) => !!v.contact_ids?.length || !!v.list, {
    message: "Provide contact_ids[] or list{}",
  });

type Supabase = ReturnType<typeof createClient>;
// deno-lint-ignore no-explicit-any
type Raw = any;

async function fetchContactById(id: string, headers: Record<string, string>, companyId?: string) {
  const resp = await forthFetch(
    `${FORTH}/contacts/${id}`,
    { method: "GET", headers },
    {
      caller: "forth-import-anonymized:fetch",
      companyId,
    },
  );
  if (!resp.ok) throw new Error(`GET /contacts/${id} -> HTTP ${resp.status}`);
  return await resp.json().catch(() => ({}));
}

/** GET a Forth endpoint and return its items as an array (handles list envelopes AND a single
 *  `{response:{...}}` object, which some endpoints return). */
async function fetchItems(
  url: string,
  headers: Record<string, string>,
  companyId?: string,
): Promise<Raw[]> {
  try {
    const resp = await forthFetch(
      url,
      { method: "GET", headers },
      {
        caller: "forth-import-anonymized:items",
        companyId,
      },
    );
    if (!resp.ok) return [];
    const body = await resp.json().catch(() => ({}));
    const arr = parseList(body);
    if (arr.length) return arr;
    const one = unwrapContact(body);
    return one && typeof one === "object" && (one.id ?? one.debt_id ?? one.settlement_id) != null
      ? [one]
      : [];
  } catch {
    return [];
  }
}

/** GET a single Forth resource and unwrap the `{response: {...}}` envelope (null on failure). */
async function fetchOne(
  url: string,
  headers: Record<string, string>,
  companyId?: string,
): Promise<Raw | null> {
  try {
    const resp = await forthFetch(
      url,
      { method: "GET", headers },
      {
        caller: "forth-import-anonymized:get-one",
        companyId,
      },
    );
    if (!resp.ok) return null;
    const body = await resp.json().catch(() => ({}));
    return unwrapContact(body);
  } catch {
    return null;
  }
}

/** Fetch the GET /debts/types lookup as { id -> title } so debt_type codes map to real types. */
async function fetchDebtTypeMap(
  headers: Record<string, string>,
  companyId: string,
): Promise<Record<string, string>> {
  const items = await fetchItems(`${FORTH}/debts/types`, headers, companyId);
  const map: Record<string, string> = {};
  for (const t of items) {
    if (t?.id != null && t?.title) map[String(t.id)] = String(t.title);
  }
  return map;
}

/** Parse a Forth money string/number ("500.00") to a number, or null. */
function money(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Has a debt object been hydrated with its detail fields (vs. just an id stub)? */
function isFullDebt(d: Raw): boolean {
  return (
    !!d &&
    typeof d === "object" &&
    (d.current_debt_amount !== undefined ||
      d.original_debt_amount !== undefined ||
      d.creditor !== undefined)
  );
}

function refId(ref: Raw): string | number | null {
  if (ref == null) return null;
  if (typeof ref === "object") return ref.id ?? ref.debt_id ?? ref.settlement_id ?? null;
  return ref;
}

/**
 * Gather a contact's enrolled debts and each debt's settlement offers using Forth's documented
 * endpoints:
 *   GET contacts/{id}/debts/enrolled   -> enrolled debts (falls back to .../debts = all debts)
 *   GET debts/{id}                     -> hydrate a debt stub to the full object
 *   GET debts/{id}/settlement_offers   -> the debt's offers (else the debt's settlement_offers ids)
 *   GET settlement_offers/{id}         -> hydrate an offer stub/id to the full object
 * Resolved offer objects are attached onto each debt as `__offers`.
 */
async function gatherDebtsAndOffers(
  forthId: string,
  _contactRaw: Raw,
  headers: Record<string, string>,
  companyId: string,
  opts: { debts: boolean; offers: boolean },
): Promise<{ debts: Raw[]; debtSource: string; offerSource: string }> {
  if (!opts.debts) return { debts: [], debtSource: "disabled", offerSource: "disabled" };

  // 1) enrolled debts for the contact (this endpoint already returns only enrolled debts)
  let refs: Raw[] = [];
  let debtSource = "none";
  const debtCands: [string, string][] = [
    [`${FORTH}/contacts/${forthId}/debts/enrolled`, "contacts/{id}/debts/enrolled"],
    [`${FORTH}/contacts/${forthId}/debts`, "contacts/{id}/debts"],
  ];
  for (const [url, label] of debtCands) {
    const items = await fetchItems(url, headers, companyId);
    if (items.length) {
      refs = items;
      debtSource = label;
      break;
    }
  }

  // 2) hydrate each debt to a full object (the list may return id stubs)
  const debts: Raw[] = [];
  for (const ref of refs) {
    if (isFullDebt(ref)) {
      debts.push(ref);
      continue;
    }
    const id = refId(ref);
    if (id == null) continue;
    const full = await fetchOne(`${FORTH}/debts/${id}`, headers, companyId);
    if (full) debts.push(full);
  }

  // 3) offers per debt
  let offerSource = "none";
  if (opts.offers) {
    for (const d of debts) {
      const debtId = d?.id ?? d?.debt_id;
      let offerRefs: Raw[] = [];
      if (debtId != null) {
        const listed = await fetchItems(
          `${FORTH}/debts/${debtId}/settlement_offers`,
          headers,
          companyId,
        );
        if (listed.length) {
          offerRefs = listed;
          offerSource = "debts/{id}/settlement_offers";
        }
      }
      if (!offerRefs.length && Array.isArray(d?.settlement_offers) && d.settlement_offers.length) {
        offerRefs = d.settlement_offers;
        offerSource = "debt.settlement_offers";
      }
      const objs: Raw[] = [];
      for (const ref of offerRefs) {
        if (
          ref &&
          typeof ref === "object" &&
          (ref.settlement_amount !== undefined ||
            ref.offer_amount !== undefined ||
            ref.amount !== undefined)
        ) {
          objs.push(ref);
          continue;
        }
        const oid = refId(ref);
        if (oid == null) continue;
        const o = await fetchOne(`${FORTH}/settlement_offers/${oid}`, headers, companyId);
        if (o) objs.push(o);
      }
      if (objs.length) d.__offers = objs;
    }
  }

  return { debts, debtSource, offerSource };
}

/** Gather raw Forth contacts from either explicit ids or the (best-effort) list endpoint. */
async function gatherContacts(
  input: z.infer<typeof InputSchema>,
  headers: Record<string, string>,
): Promise<{ raw: Raw[]; errors: { id: string; error: string }[] }> {
  const companyId = input.company_id;
  const raw: Raw[] = [];
  const errors: { id: string; error: string }[] = [];

  if (input.contact_ids?.length) {
    for (const id of input.contact_ids) {
      try {
        raw.push(await fetchContactById(String(id), headers, companyId));
      } catch (e) {
        errors.push({ id: String(id), error: e instanceof Error ? e.message : String(e) });
      }
    }
    return { raw, errors };
  }

  const { limit, page } = input.list!;
  const resp = await forthFetch(
    `${FORTH}/contacts?limit=${limit}&page=${page}`,
    { method: "GET", headers },
    { caller: "forth-import-anonymized:list", companyId },
  );
  if (!resp.ok) throw new Error(`GET /contacts (list) -> HTTP ${resp.status}`);
  const body = await resp.json().catch(() => ({}));
  const items = parseContactList(body);

  if (!input.hydrate) return { raw: items, errors };

  for (const item of items) {
    const id = extractContactId(item);
    if (!id) {
      raw.push(item);
      continue;
    }
    try {
      raw.push(await fetchContactById(id, headers, companyId));
    } catch (e) {
      errors.push({ id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { raw, errors };
}

interface Prepared {
  map: MappedContact;
  liabilities: AnonLiability[];
  debt_source: string;
  offer_source: string;
}

/** Resolve a creditor row id by name (real creditor names from Forth debts), creating it if new.
 *  Cached per-invocation so repeated creditors aren't re-queried. */
async function getCreditorId(
  supabase: Supabase,
  cache: Map<string, string | null>,
  name: string | null,
): Promise<string | null> {
  if (!name) return null;
  const k = name.trim().toLowerCase();
  if (cache.has(k)) return cache.get(k) ?? null;
  const { data: found } = await supabase
    .from("creditors")
    .select("id")
    .ilike("name", name.trim())
    .limit(1)
    .maybeSingle();
  let id = (found?.id as string | undefined) ?? null;
  if (!id) {
    const { data: created } = await supabase
      .from("creditors")
      .insert({ name: name.trim(), creditor_type: "original_creditor" })
      .select("id")
      .single();
    id = (created?.id as string | undefined) ?? null;
  }
  cache.set(k, id);
  return id;
}

async function persist(
  supabase: Supabase,
  companyId: string,
  p: Prepared,
  creditorCache: Map<string, string | null>,
): Promise<{ client_id: string; service_number: string | null; debts: number; offers: number }> {
  const m = p.map;
  const clientFields = {
    company_id: companyId,
    first_name: m.client.first_name,
    last_name: m.client.last_name,
    middle_name: m.client.middle_name,
    email: m.client.email,
    date_of_birth: m.client.date_of_birth,
    ssn_last4: m.client.ssn_last4,
    status: m.client.status,
    is_active: m.client.is_active,
    forth_crm_id: m.client.forth_crm_id, // real Forth contact id (dedupe + re-fetch key)
    forth_status: m.service.status,
    notes: m.client.notes,
  };

  // upsert the client by (company_id, forth_crm_id)
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("company_id", companyId)
    .eq("forth_crm_id", m.client.forth_crm_id)
    .maybeSingle();
  let clientId: string;
  if (existingClient?.id) {
    const { error } = await supabase
      .from("clients")
      .update(clientFields)
      .eq("id", existingClient.id);
    if (error) throw new Error(`client update failed: ${error.message}`);
    clientId = existingClient.id as string;
  } else {
    const { data: created, error } = await supabase
      .from("clients")
      .insert(clientFields)
      .select("id")
      .single();
    if (error || !created) throw new Error(`client insert failed: ${error?.message ?? "no row"}`);
    clientId = created.id as string;
  }

  const serviceFields = {
    owning_company_id: companyId,
    originating_company_id: companyId,
    primary_client_id: clientId,
    status: m.service.status,
    program_type: m.service.program_type,
    plan_type: m.service.plan_type,
    payment_frequency: m.service.payment_frequency,
    term_months: m.service.term_months,
    monthly_payment: m.service.monthly_payment,
    total_enrolled_debt: m.service.total_enrolled_debt,
    settlement_fee_percentage: m.service.settlement_fee_percentage,
    escrow_balance: m.service.escrow_balance,
    enrolled_date: m.service.enrolled_date,
    program_start_date: m.service.program_start_date,
    estimated_completion_date: m.service.estimated_completion_date,
    notes: m.service.notes,
  };

  // upsert the (single) imported engagement for this client
  const { data: existingSvc } = await supabase
    .from("client_services")
    .select("id, service_number")
    .eq("owning_company_id", companyId)
    .eq("primary_client_id", clientId)
    .maybeSingle();
  let svcId: string;
  let svcNumber: string | null;
  if (existingSvc?.id) {
    const { error } = await supabase
      .from("client_services")
      .update(serviceFields)
      .eq("id", existingSvc.id);
    if (error) throw new Error(`engagement update failed: ${error.message}`);
    svcId = existingSvc.id as string;
    svcNumber = (existingSvc.service_number ?? null) as string | null;
    // re-sync: drop previously-imported liabilities (+ their settlements) so re-import doesn't dup.
    // scoped to imported rows (notes prefix) so manually-added debts are left intact.
    const { data: oldLiabs } = await supabase
      .from("liabilities")
      .select("id")
      .eq("client_service_id", svcId)
      .like("notes", "Imported from Forth%");
    const oldIds = (oldLiabs ?? []).map((r) => r.id);
    if (oldIds.length) {
      await supabase.from("settlements").delete().in("liability_id", oldIds);
      await supabase.from("liabilities").delete().in("id", oldIds);
    }
  } else {
    const { data: created, error } = await supabase
      .from("client_services")
      .insert(serviceFields)
      .select("id, service_number")
      .single();
    if (error || !created) {
      if (!existingClient) await supabase.from("clients").delete().eq("id", clientId);
      throw new Error(`engagement insert failed: ${error?.message ?? "no row"}`);
    }
    svcId = created.id as string;
    svcNumber = (created.service_number ?? null) as string | null;
  }

  let debtsInserted = 0;
  let offersInserted = 0;
  for (const liab of p.liabilities) {
    const creditorId = await getCreditorId(supabase, creditorCache, liab.creditor_name);
    const { data: row, error: lErr } = await supabase
      .from("liabilities")
      .insert({
        client_service_id: svcId,
        current_creditor_id: creditorId, // real creditor name from the Forth debt
        account_number: liab.account_number,
        liability_type: liab.liability_type,
        original_balance: liab.original_balance,
        current_balance: liab.current_balance,
        enrolled_balance: liab.enrolled_balance,
        status: liab.status,
        priority: liab.priority,
        notes: liab.notes,
      })
      .select("id")
      .single();
    if (lErr || !row) continue; // skip the debt but keep going; surfaced via counts
    debtsInserted++;
    if (liab.settlements.length) {
      const rows = liab.settlements.map((s) => ({
        liability_id: row.id,
        offer_amount: s.offer_amount,
        offer_percentage: s.offer_percentage,
        payment_type: s.payment_type,
        number_of_payments: s.number_of_payments,
        status: s.status,
        offered_date: s.offered_date ?? undefined, // let DB default (today) when unknown
        accepted_date: s.accepted_date,
        completed_date: s.completed_date,
        first_payment_date: s.first_payment_date,
        payment_schedule: s.payment_schedule,
        notes: s.notes,
      }));
      const { count, error: stErr } = await supabase
        .from("settlements")
        .insert(rows, { count: "exact" });
      if (!stErr) offersInserted += count ?? rows.length;
    }
  }

  await supabase.from("plsa_sync_log").insert({
    entity_type: "client",
    entity_id: clientId,
    action: "sync",
    provider_id: "forth",
    success: true,
    request_payload: { source_key: m.source_key, import: "anonymized" },
    response_payload: {
      service_number: svcNumber,
      debts: debtsInserted,
      offers: offersInserted,
      debt_source: p.debt_source,
      offer_source: p.offer_source,
    },
  });

  return {
    client_id: clientId,
    service_number: svcNumber,
    debts: debtsInserted,
    offers: offersInserted,
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
  const input = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: company, error: coErr } = await supabase
      .from("companies")
      .select("id")
      .eq("id", input.company_id)
      .maybeSingle();
    if (coErr || !company) {
      return jsonResponse(req, { success: false, error: "company_id not found" }, 404);
    }

    const token = await getAccessToken(input.company_id);
    const headers = buildForthHeaders(token);

    // one-time lookup so debt_type codes resolve to real liability types
    const typeMap = input.include_debts ? await fetchDebtTypeMap(headers, input.company_id) : {};

    const { raw, errors } = await gatherContacts(input, headers);

    const importTag = new Date().toISOString().slice(0, 10);
    const prepared: Prepared[] = [];
    let rawSample: unknown = null; // PII-masked sample of the first debt+offers, for diagnostics

    for (const r of raw) {
      const forthId = extractContactId(r);
      if (!forthId) {
        errors.push({ id: "unknown", error: "unmappable (no id)" });
        continue;
      }
      // pull debts + offers, then fold them onto the contact so the engagement total reflects them
      const {
        debts: allDebts,
        debtSource,
        offerSource,
      } = await gatherDebtsAndOffers(forthId, r, headers, input.company_id, {
        debts: input.include_debts,
        offers: input.include_offers,
      });
      // capture a masked sample of a real debt (BEFORE filtering) so the live shape can be confirmed
      if (rawSample === null && allDebts.length) rawSample = maskPII(allDebts[0]);
      // the .../debts/enrolled endpoint already returns only enrolled debts; the all-debts
      // fallback still needs filtering.
      const debts = debtSource.includes("enrolled") ? allDebts : allDebts.filter(isEnrolledDebt);

      const c = unwrapContact(r);
      if (debts.length) c.debts = debts;

      // engagement financials + escrow live on separate Forth endpoints
      const programDetails = await fetchOne(
        `${FORTH}/contacts/${forthId}/program-details`,
        headers,
        input.company_id,
      );
      const escrowRaw = await fetchOne(
        `${FORTH}/enrollment/${forthId}/balance`,
        headers,
        input.company_id,
      );
      const escrowBalance = money(escrowRaw?.balance ?? escrowRaw?.data?.balance);

      const map = mapContact(r, {
        importTag,
        defaultPlanType: input.default_plan_type,
        programDetails,
        escrowBalance,
      });
      if (!map) {
        errors.push({ id: forthId, error: "unmappable (no id)" });
        continue;
      }
      prepared.push({
        map,
        liabilities: mapDebts(debts, importTag, typeMap),
        debt_source: debtSource,
        offer_source: offerSource,
      });
    }

    // de-dupe against anything already imported into this company (idempotent re-runs)
    const keys = prepared.map((p) => p.map.source_key);
    const existing = new Set<string>();
    if (keys.length) {
      const { data: rows } = await supabase
        .from("clients")
        .select("forth_crm_id")
        .eq("company_id", input.company_id)
        .in("forth_crm_id", keys);
      for (const row of rows ?? []) if (row.forth_crm_id) existing.add(row.forth_crm_id as string);
    }
    const fresh = prepared.filter((p) => !existing.has(p.map.source_key));
    const alreadyThere = prepared.length - fresh.length;
    // with update_existing we process everything (existing rows get updated); otherwise skip them
    const toProcess = input.update_existing ? prepared : fresh;

    const debtsFound = prepared.reduce((n, p) => n + p.liabilities.length, 0);
    const offersFound = prepared.reduce(
      (n, p) => n + p.liabilities.reduce((m, l) => m + l.settlements.length, 0),
      0,
    );

    if (input.dry_run) {
      return jsonResponse(req, {
        success: true,
        dry_run: true,
        mode: input.contact_ids?.length ? "ids" : "list",
        fetched: raw.length,
        mappable: prepared.length,
        would_create: fresh.length,
        would_update: input.update_existing ? alreadyThere : 0,
        would_skip: input.update_existing ? 0 : alreadyThere,
        debts_found: debtsFound,
        offers_found: offersFound,
        debt_source: prepared.find((p) => p.debt_source !== "none")?.debt_source ?? "none",
        offer_source: prepared.find((p) => p.offer_source !== "none")?.offer_source ?? "none",
        raw_debt_sample: rawSample, // PII-masked — confirms Forth's real shape
        errors,
        previews: toProcess.slice(0, 25).map((p) => ({
          client: p.map.client,
          service: p.map.service,
          liabilities: p.liabilities,
        })),
      });
    }

    const imported: {
      client_id: string;
      service_number: string | null;
      debts: number;
      offers: number;
      source_key: string;
    }[] = [];
    const creditorCache = new Map<string, string | null>();
    for (const p of toProcess) {
      try {
        const r = await persist(supabase, input.company_id, p, creditorCache);
        imported.push({ ...r, source_key: p.map.source_key });
      } catch (e) {
        errors.push({ id: p.map.source_key, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return jsonResponse(req, {
      success: true,
      dry_run: false,
      mode: input.contact_ids?.length ? "ids" : "list",
      fetched: raw.length,
      updated: input.update_existing ? alreadyThere : 0,
      skipped: input.update_existing ? 0 : alreadyThere,
      imported: imported.length,
      debts_imported: imported.reduce((n, r) => n + r.debts, 0),
      offers_imported: imported.reduce((n, r) => n + r.offers, 0),
      records: imported,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("forth-import-anonymized error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
