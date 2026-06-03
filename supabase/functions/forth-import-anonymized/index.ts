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

/** GET a Forth list endpoint; returns the parsed array (empty + ok:false on non-2xx). */
async function fetchList(url: string, headers: Record<string, string>, companyId?: string) {
  try {
    const resp = await forthFetch(
      url,
      { method: "GET", headers },
      {
        caller: "forth-import-anonymized:list-sub",
        companyId,
      },
    );
    if (!resp.ok) return { ok: false, items: [] as Raw[] };
    const body = await resp.json().catch(() => ({}));
    return { ok: true, items: parseList(body) };
  } catch {
    return { ok: false, items: [] as Raw[] };
  }
}

/**
 * Find a contact's debts (and each debt's offers) by probing the likely Forth endpoints in order
 * and using the first that yields data. Attaches offers onto each debt as `__offers`.
 */
async function gatherDebtsAndOffers(
  forthId: string,
  contactRaw: Raw,
  headers: Record<string, string>,
  companyId: string,
  opts: { debts: boolean; offers: boolean },
): Promise<{ debts: Raw[]; debtSource: string; offerSource: string }> {
  if (!opts.debts) return { debts: [], debtSource: "disabled", offerSource: "disabled" };

  const nested = unwrapContact(contactRaw)?.debts;
  let debts: Raw[] = Array.isArray(nested) ? nested : [];
  let debtSource = debts.length ? "contact.debts" : "none";

  if (!debts.length) {
    const candidates: [string, string][] = [
      [`${FORTH}/debts?client_id=${forthId}`, "debts?client_id"],
      [`${FORTH}/debts?contact_id=${forthId}`, "debts?contact_id"],
      [`${FORTH}/contacts/${forthId}/debts`, "contacts/{id}/debts"],
    ];
    for (const [url, label] of candidates) {
      const r = await fetchList(url, headers, companyId);
      if (r.ok && r.items.length) {
        debts = r.items;
        debtSource = label;
        break;
      }
    }
  }

  let offerSource = "none";
  if (opts.offers) {
    for (const d of debts) {
      const nestedOffers = d?.offers ?? d?.settlements ?? d?.settlement_offers;
      if (Array.isArray(nestedOffers) && nestedOffers.length) {
        d.__offers = nestedOffers;
        offerSource = "debt.offers";
        continue;
      }
      const debtId = d?.id ?? d?.debt_id;
      if (debtId === undefined || debtId === null) continue;
      const candidates: [string, string][] = [
        [`${FORTH}/debts/${debtId}/offers`, "debts/{id}/offers"],
        [`${FORTH}/debts/${debtId}/settlements`, "debts/{id}/settlements"],
        [`${FORTH}/offers?debt_id=${debtId}`, "offers?debt_id"],
      ];
      for (const [url, label] of candidates) {
        const r = await fetchList(url, headers, companyId);
        if (r.ok && r.items.length) {
          d.__offers = r.items;
          offerSource = label;
          break;
        }
      }
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
  const { data: client, error: cErr } = await supabase
    .from("clients")
    .insert({
      company_id: companyId,
      first_name: m.client.first_name,
      last_name: m.client.last_name,
      middle_name: m.client.middle_name,
      email: m.client.email,
      date_of_birth: m.client.date_of_birth,
      ssn_last4: m.client.ssn_last4,
      status: m.client.status,
      is_active: m.client.is_active,
      forth_crm_id: m.client.forth_crm_id, // ANON-… (de-identified, not reversible)
      forth_status: m.service.status,
      notes: m.client.notes,
    })
    .select("id")
    .single();
  if (cErr || !client) throw new Error(`client insert failed: ${cErr?.message ?? "no row"}`);

  const { data: svc, error: sErr } = await supabase
    .from("client_services")
    .insert({
      owning_company_id: companyId,
      originating_company_id: companyId,
      primary_client_id: client.id,
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
    })
    .select("id, service_number")
    .single();
  if (sErr || !svc) {
    await supabase.from("clients").delete().eq("id", client.id);
    throw new Error(`engagement insert failed: ${sErr?.message ?? "no row"}`);
  }

  let debtsInserted = 0;
  let offersInserted = 0;
  for (const liab of p.liabilities) {
    const creditorId = await getCreditorId(supabase, creditorCache, liab.creditor_name);
    const { data: row, error: lErr } = await supabase
      .from("liabilities")
      .insert({
        client_service_id: svc.id,
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
    entity_id: client.id,
    action: "sync",
    provider_id: "forth",
    success: true,
    request_payload: { source_key: m.source_key, import: "anonymized" },
    response_payload: {
      service_number: svc.service_number ?? null,
      debts: debtsInserted,
      offers: offersInserted,
      debt_source: p.debt_source,
      offer_source: p.offer_source,
    },
  });

  return {
    client_id: client.id as string,
    service_number: (svc.service_number ?? null) as string | null,
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
      // only import enrolled debts
      const debts = allDebts.filter(isEnrolledDebt);

      const c = unwrapContact(r);
      if (debts.length) c.debts = debts;
      const map = mapContact(r, { importTag, defaultPlanType: input.default_plan_type });
      if (!map) {
        errors.push({ id: forthId, error: "unmappable (no id)" });
        continue;
      }
      prepared.push({
        map,
        liabilities: mapDebts(debts, importTag),
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
    const skipped = prepared.length - fresh.length;

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
        already_imported: skipped,
        would_import: fresh.length,
        debts_found: debtsFound,
        offers_found: offersFound,
        debt_source: prepared.find((p) => p.debt_source !== "none")?.debt_source ?? "none",
        offer_source: prepared.find((p) => p.offer_source !== "none")?.offer_source ?? "none",
        raw_debt_sample: rawSample, // PII-masked — confirms Forth's real shape
        errors,
        previews: fresh.slice(0, 25).map((p) => ({
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
    for (const p of fresh) {
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
      already_imported: skipped,
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
