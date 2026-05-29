// forth-poll-transactions — poll Forth Pay for the status of pending drafts and reconcile locally.
// Scheduled via cron (service-role) and also callable on demand. Round-robins by last_polled_at.
// TODO(forth-docs): confirm the reports/transactions endpoint + response shape.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";
import { mapForthStatus, isNSF, findForthTx, type ForthTx } from "../_shared/forthLogic.ts";

const InputSchema = z.object({ limit: z.number().int().positive().max(100).optional() }).optional();

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const gate = await requireAuth(req);
  if (gate instanceof Response) return gate;

  const raw = await req.json().catch(() => ({}));
  const parsed = InputSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return jsonResponse(
      req,
      { success: false, error: "Invalid request", issues: parsed.error.issues },
      400,
    );
  }
  const limit = parsed.data?.limit ?? 100;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: pending, error } = await supabase
      .from("transactions")
      .select("id, external_id, status, last_polled_at")
      .eq("status", "pending")
      .not("external_id", "is", null)
      .order("last_polled_at", { ascending: true, nullsFirst: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    if (!pending || pending.length === 0) {
      return jsonResponse(req, { success: true, polled: 0, updated: 0, errors: 0 });
    }

    const accessToken = await getAccessToken();
    let updated = 0;
    let errors = 0;

    for (const tx of pending) {
      const nowIso = new Date().toISOString();
      try {
        const reportPayload = { draft_ids: [parseInt(tx.external_id, 10)] };
        const resp = await forthFetch(
          "https://api.forthpay.com/v1/reports/transactions",
          {
            method: "POST",
            headers: buildForthHeaders(accessToken),
            body: JSON.stringify(reportPayload),
          },
          { caller: "forth-poll-transactions" },
        );
        const result = await resp.json();
        const list: ForthTx[] = result.response?.transactions ?? result.transactions ?? [];
        const forthTx = findForthTx(list, tx.external_id);

        if (!forthTx) {
          await supabase.from("transactions").update({ last_polled_at: nowIso }).eq("id", tx.id);
          continue;
        }

        const newStatus = mapForthStatus(forthTx.status);
        const nsf = isNSF(forthTx);
        const update: Record<string, unknown> = { last_polled_at: nowIso, last_sync_at: nowIso };

        if (newStatus !== tx.status) {
          update.status = newStatus;
          update.sync_error = null;
          if (newStatus === "cleared") {
            update.processed_at = forthTx.cleared_at ?? forthTx.processed_at ?? nowIso;
          }
          if (newStatus === "failed") {
            update.error_message =
              forthTx.error_message ?? (nsf ? "NSF - Insufficient Funds" : "Transaction failed");
            update.sync_error = JSON.stringify(forthTx);
          }
          await supabase.from("plsa_sync_log").insert({
            entity_type: "transaction",
            entity_id: tx.id,
            action: "poll",
            provider_id: "forth",
            request_payload: reportPayload,
            response_payload: forthTx,
            success: true,
          });
          updated += 1;

          if (newStatus === "failed" && nsf) {
            // Schedule NSF retry (plsa-nsf-retry lands in the reconciliation increment).
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/plsa-nsf-retry`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ mode: "schedule", transaction_id: tx.id }),
            }).catch((e) => console.error("[forth-poll-transactions] NSF schedule failed", e));
          }
        }
        await supabase.from("transactions").update(update).eq("id", tx.id);
      } catch (txErr) {
        errors += 1;
        const message = txErr instanceof Error ? txErr.message : "Unknown error";
        await supabase.from("plsa_sync_log").insert({
          entity_type: "transaction",
          entity_id: tx.id,
          action: "poll",
          provider_id: "forth",
          request_payload: { external_id: tx.external_id },
          success: false,
          error_message: message,
        });
      }
    }

    return jsonResponse(req, { success: true, polled: pending.length, updated, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("forth-poll-transactions error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
