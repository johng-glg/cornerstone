// docuseal-send — dispatch a drafted signature_request to DocuSeal. Creates a DocuSeal
// submission from the request's docuseal_template_id + its signer rows, then records the
// submission/submitter ids, signing URLs, and a 'sent' signature_event.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireIntegrationEnabled, logIntegrationEvent } from "../_shared/integrations.ts";
import { resolveCompanyId } from "../_shared/markIntegrationConnected.ts";
import { buildSubmissionPayload, normalizeEmail, type SignerInput } from "../_shared/docuseal.ts";

const InputSchema = z.object({ request_id: z.string().uuid() });

// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

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
  const { request_id } = parsed.data;
  const companyId = await resolveCompanyId(req.headers.get("Authorization"));

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  try {
    const { data: request } = await admin
      .from("signature_requests")
      .select("id, company_id, docuseal_template_id, status, signing_mode, delivery_method")
      .eq("id", request_id)
      .maybeSingle();
    if (!request)
      return jsonResponse(req, { success: false, error: "Signature request not found" }, 404);
    if (!companyId || request.company_id !== companyId) {
      return jsonResponse(req, { success: false, error: "Forbidden" }, 403);
    }
    await requireIntegrationEnabled(companyId, "docuseal");
    if (!request.docuseal_template_id) {
      return jsonResponse(
        req,
        { success: false, error: "Request has no docuseal_template_id" },
        409,
      );
    }

    const { data: signers } = await admin
      .from("signature_signers")
      .select("id, signer_role, name, email, phone, order_index")
      .eq("request_id", request_id);
    if (!signers || signers.length === 0) {
      return jsonResponse(req, { success: false, error: "Request has no signers" }, 409);
    }

    const payload = buildSubmissionPayload(request.docuseal_template_id, signers as SignerInput[], {
      signingMode: request.signing_mode,
      deliveryMethod: request.delivery_method,
    });

    const resp = await fetch("https://api.docuseal.com/submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": Deno.env.get("DOCUSEAL_API_TOKEN") ?? "",
      },
      body: JSON.stringify(payload),
    });
    const body = (await resp.json().catch(() => null)) as Json[] | Json | null;
    if (!resp.ok || !Array.isArray(body)) {
      const errMsg = `DocuSeal submission failed: ${resp.status}`;
      await admin.from("signature_requests").update({ status: "error" }).eq("id", request_id);
      await logIntegrationEvent({
        companyId,
        providerKey: "docuseal",
        eventType: "submission_create",
        direction: "outbound",
        entityType: "signature_request",
        entityId: request_id,
        success: false,
        errorMessage: errMsg,
      });
      return jsonResponse(req, { success: false, error: errMsg }, 502);
    }

    const submissionId = Number(body[0]?.submission_id ?? body[0]?.submission?.id) || null;
    await admin
      .from("signature_requests")
      .update({ docuseal_submission_id: submissionId, status: "sent" })
      .eq("id", request_id);

    // Match returned submitters back to local signers by email and store ids + signing URLs.
    const byEmail = new Map(signers.map((s) => [normalizeEmail(s.email), s]));
    for (const sub of body) {
      const local = byEmail.get(normalizeEmail(sub.email));
      if (!local) continue;
      const signingUrl = sub.embed_src ?? (sub.slug ? `https://docuseal.com/s/${sub.slug}` : null);
      await admin
        .from("signature_signers")
        .update({
          docuseal_submitter_id: Number(sub.id) || null,
          signing_url: signingUrl,
          status: "sent",
        })
        .eq("id", local.id);
    }

    await admin.from("signature_events").insert({
      request_id,
      event_type: "sent",
      event_data: { submission_id: submissionId, submitters: body.length },
    });
    await logIntegrationEvent({
      companyId,
      providerKey: "docuseal",
      eventType: "submission_create",
      direction: "outbound",
      entityType: "signature_request",
      entityId: request_id,
      success: true,
    });
    return jsonResponse(req, { success: true, submission_id: submissionId, signers: body.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("docuseal-send error:", message);
    const status = message.startsWith("Integration disabled") ? 409 : 500;
    return jsonResponse(req, { success: false, error: message }, status);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
