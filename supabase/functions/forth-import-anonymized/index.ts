// forth-import-anonymized — pull real Forth CRM contacts and load them into Cornerstone as
// de-identified clients + engagements (client_services). Every PII / contact field is replaced
// with obvious dummy data; the non-PII program structure (debt totals, payment, term, status,
// dates) is preserved. Intended for seeding a dev/staging tenant with realistic-but-safe records.
//
//   Safety: dry_run defaults to TRUE — the first call returns exactly what *would* be written,
//           with PII already scrubbed, and writes nothing. Re-call with dry_run:false to persist.
//
//   Sources (pick one):
//     contact_ids: [...]   reliable — fetches each via the proven GET /contacts/{id}
//     list: {limit,page}   best-effort bulk list (GET /contacts?...). TODO(forth-docs): confirm
//                          the list endpoint + params; shape parsing is defensive.
//
// All anonymization/mapping logic lives in ../_shared/forthImport.ts (pure, unit-tested offline).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { buildForthHeaders, forthFetch, getAccessToken } from "../_shared/forthAuth.ts";
import {
  extractContactId,
  mapContact,
  type MappedContact,
  parseContactList,
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
    hydrate: z.boolean().default(true), // in list mode, re-GET each contact for full detail
    dry_run: z.boolean().default(true), // SAFE default: don't write
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

  // list mode
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

async function persist(
  supabase: Supabase,
  companyId: string,
  m: MappedContact,
): Promise<{ client_id: string; service_number: string | null }> {
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
      // service_number is generated by a BEFORE INSERT trigger; plsa_provider_id defaults to 'forth'
    })
    .select("service_number")
    .single();
  if (sErr) {
    // engagement failed — remove the orphan client so a retry is clean
    await supabase.from("clients").delete().eq("id", client.id);
    throw new Error(`engagement insert failed: ${sErr.message}`);
  }

  await supabase.from("plsa_sync_log").insert({
    entity_type: "client",
    entity_id: client.id,
    action: "sync",
    provider_id: "forth",
    success: true,
    request_payload: { source_key: m.source_key, import: "anonymized" },
    response_payload: { service_number: svc?.service_number ?? null },
  });

  return {
    client_id: client.id as string,
    service_number: (svc?.service_number ?? null) as string | null,
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
    // company must exist (also a guard against importing into a stray uuid)
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
    const mapped: MappedContact[] = [];
    for (const r of raw) {
      const m = mapContact(r, { importTag, defaultPlanType: input.default_plan_type });
      if (m) mapped.push(m);
      else errors.push({ id: extractContactId(r) ?? "unknown", error: "unmappable (no id)" });
    }

    // de-dupe against anything already imported into this company (idempotent re-runs)
    const keys = mapped.map((m) => m.source_key);
    const existing = new Set<string>();
    if (keys.length) {
      const { data: rows } = await supabase
        .from("clients")
        .select("forth_crm_id")
        .eq("company_id", input.company_id)
        .in("forth_crm_id", keys);
      for (const row of rows ?? []) if (row.forth_crm_id) existing.add(row.forth_crm_id as string);
    }
    const fresh = mapped.filter((m) => !existing.has(m.source_key));
    const skipped = mapped.length - fresh.length;

    if (input.dry_run) {
      return jsonResponse(req, {
        success: true,
        dry_run: true,
        mode: input.contact_ids?.length ? "ids" : "list",
        fetched: raw.length,
        mappable: mapped.length,
        already_imported: skipped,
        would_import: fresh.length,
        errors,
        previews: fresh.slice(0, 25), // PII-free
      });
    }

    const imported: { client_id: string; service_number: string | null; source_key: string }[] = [];
    for (const m of fresh) {
      try {
        const r = await persist(supabase, input.company_id, m);
        imported.push({ ...r, source_key: m.source_key });
      } catch (e) {
        errors.push({ id: m.source_key, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return jsonResponse(req, {
      success: true,
      dry_run: false,
      mode: input.contact_ids?.length ? "ids" : "list",
      fetched: raw.length,
      already_imported: skipped,
      imported: imported.length,
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
