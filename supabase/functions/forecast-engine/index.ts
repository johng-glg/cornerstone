// forecast-engine — Settlement Forecasting & Early-Warning Engine (spec: J. Greenway).
// Thin orchestration over the Postgres projection functions (fn_project_balance /
// fn_project_verdict). The arithmetic lives in SQL for fidelity to the validated Snowflake view.
//
//   action: "project_client"   — Mode B: project a client's pool (no prospective lines)
//           "evaluate_offer"   — Mode A: feasibility of one prospective offer
//           "evaluate_offers"  — Mode A batch: a set of prospective offers (multi-offer hazard, §5)
//
// PR 1 of the engine (core + Modes A/B). Event handler, alerts, AR earning, and the modification
// solver land in PR 2.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const Id = z.union([z.string(), z.number()]);

const InputSchema = z
  .object({
    action: z.enum(["project_client", "evaluate_offer", "evaluate_offers"]),
    contact_id: Id.optional(),
    offer_id: Id.optional(),
    offer_ids: z.array(Id).optional(),
    floor: z.number().optional(), // override; defaults to system_setting.min_balance_floor
  })
  .refine((v) => v.action !== "project_client" || v.contact_id != null, {
    message: "project_client requires contact_id",
  })
  .refine((v) => v.action !== "evaluate_offer" || v.offer_id != null, {
    message: "evaluate_offer requires offer_id",
  })
  .refine((v) => v.action !== "evaluate_offers" || (v.offer_ids?.length ?? 0) > 0, {
    message: "evaluate_offers requires offer_ids[]",
  });

// deno-lint-ignore no-explicit-any
type Supabase = any;
const num = (v: unknown) => Number(v);

interface Verdict {
  min_balance: number | null;
  breach: boolean;
  additional_needed: number | null;
  headroom: number | null;
  breach_date: string | null;
  start_date: string | null;
}

/** Call the SQL verdict for a contact, optionally with a set of prospective offers. */
async function verdict(
  supabase: Supabase,
  contactId: number,
  offerIds: number[] | null,
  floor?: number,
): Promise<Verdict | null> {
  const { data, error } = await supabase.rpc("fn_project_verdict", {
    p_contact_id: contactId,
    p_prospective_offer_ids: offerIds,
    p_floor: floor ?? null,
    p_incidental: null,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as Verdict | null;
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
    if (input.action === "project_client") {
      const contactId = num(input.contact_id);
      const v = await verdict(supabase, contactId, null, input.floor);
      return jsonResponse(req, {
        success: true,
        action: input.action,
        contact_id: contactId,
        verdict: v,
      });
    }

    if (input.action === "evaluate_offer") {
      const offerId = num(input.offer_id);
      const { data: offer, error } = await supabase
        .from("settlement_offer")
        .select("offer_id, contact_id, debt_id")
        .eq("offer_id", offerId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!offer) return jsonResponse(req, { success: false, error: "offer not found" }, 404);
      const v = await verdict(supabase, num(offer.contact_id), [offerId], input.floor);
      return jsonResponse(req, {
        success: true,
        action: input.action,
        offer_id: offerId,
        contact_id: num(offer.contact_id),
        verdict: v,
      });
    }

    // evaluate_offers — batch. Offers are grouped by contact so each contact's set is evaluated on
    // ONE timeline (catches offers that pass individually but jointly breach, §5).
    const offerIds = (input.offer_ids ?? []).map(num);
    const { data: offers, error } = await supabase
      .from("settlement_offer")
      .select("offer_id, contact_id")
      .in("offer_id", offerIds);
    if (error) throw new Error(error.message);
    const byContact = new Map<number, number[]>();
    for (const o of offers ?? []) {
      const c = num(o.contact_id);
      byContact.set(c, [...(byContact.get(c) ?? []), num(o.offer_id)]);
    }
    const results = [];
    for (const [contactId, ids] of byContact) {
      results.push({
        contact_id: contactId,
        offer_ids: ids,
        verdict: await verdict(supabase, contactId, ids, input.floor),
      });
    }
    return jsonResponse(req, { success: true, action: input.action, groups: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("forecast-engine error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
