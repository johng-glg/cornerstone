// docuseal-webhook — HMAC-verified inbound DocuSeal events. Advances signer + request status
// (form.viewed/completed/declined, submission.completed/expired), stores the executed PDF +
// certificate on completion, and appends a signature_event. HMAC is the trust boundary.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { enforceRateLimit, clientIp } from "../_shared/rateLimit.ts";
import { verifyHmacSha256Hex } from "../_shared/hmac.ts";
import { logIntegrationEvent } from "../_shared/integrations.ts";
import {
  classifyDocusealEvent,
  normalizeEmail,
  submissionIdOf,
  pickExecutedPdfUrl,
  pickCertificateUrl,
} from "../_shared/docuseal.ts";

// DocuSeal payloads vary by event; validate it's a JSON object and tolerate unknown keys.
const EvtSchema = z.object({}).passthrough();
// deno-lint-ignore no-explicit-any
type Evt = Record<string, any>;

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  // Unauthenticated endpoint: rate-limit by source IP before HMAC to blunt signature brute-force.
  const limited = await enforceRateLimit(req, {
    bucket: "docuseal-webhook",
    identifier: clientIp(req),
    maxRequests: 120,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const raw = await req.text();
  const signature =
    req.headers.get("x-docuseal-signature") ?? req.headers.get("X-Docuseal-Signature") ?? "";
  const secret = Deno.env.get("DOCUSEAL_WEBHOOK_SECRET") ?? "";
  if (!(await verifyHmacSha256Hex(raw, secret, signature))) {
    await logIntegrationEvent({
      providerKey: "docuseal",
      eventType: "inbound_webhook",
      direction: "inbound",
      success: false,
      errorMessage: "invalid signature",
    });
    return jsonResponse(req, { error: "invalid signature" }, 401);
  }

  let evt: Evt = {};
  try {
    const parsed = EvtSchema.safeParse(JSON.parse(raw));
    if (parsed.success) evt = parsed.data as Evt;
  } catch {
    /* tolerate malformed bodies */
  }

  const eventType = String(evt.event_type ?? evt.event ?? "");
  const data: Evt = evt.data ?? {};
  const cls = classifyDocusealEvent(eventType);
  const submissionId = submissionIdOf(data);
  if (!submissionId) return jsonResponse(req, { success: true, skipped: "no submission id" });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: request } = await admin
    .from("signature_requests")
    .select("id, company_id, status")
    .eq("docuseal_submission_id", submissionId)
    .maybeSingle();
  if (!request) return jsonResponse(req, { success: true, skipped: "unknown submission" });

  let signerId: string | null = null;
  if (cls.scope === "signer") {
    // Match by DocuSeal submitter id, else by email within this request.
    const submitterId = Number(data.id) || null;
    let q = admin.from("signature_signers").select("id").eq("request_id", request.id);
    q = submitterId
      ? q.eq("docuseal_submitter_id", submitterId)
      : q.eq("email", normalizeEmail(data.email));
    const { data: signer } = await q.maybeSingle();
    signerId = signer?.id ?? null;
    if (signerId && cls.signerStatus) {
      await admin
        .from("signature_signers")
        .update({
          status: cls.signerStatus,
          ...(cls.signerStatus === "signed" ? { signed_at: new Date().toISOString() } : {}),
          ...(data.ip_address ? { ip_address: String(data.ip_address) } : {}),
          ...(data.ua || data.user_agent ? { user_agent: String(data.ua ?? data.user_agent) } : {}),
          ...(submitterId ? { docuseal_submitter_id: submitterId } : {}),
        })
        .eq("id", signerId);
    }
  }

  // Advance request status. Never downgrade a completed request; only set terminal/forward states.
  const terminal = new Set(["completed", "declined", "expired", "canceled"]);
  if (cls.requestStatus && !(request.status === "completed" && cls.requestStatus !== "completed")) {
    const update: Record<string, unknown> = { status: cls.requestStatus };
    if (eventType.toLowerCase() === "submission.completed") {
      update.completed_at = new Date().toISOString();
      update.executed_pdf_url = pickExecutedPdfUrl(data);
      update.certificate_url = pickCertificateUrl(data);
      update.evidence_json = data;
    }
    // partially_signed must not clobber an already-terminal state
    if (!(terminal.has(String(request.status)) && cls.requestStatus === "partially_signed")) {
      await admin.from("signature_requests").update(update).eq("id", request.id);
    }
  }

  await admin.from("signature_events").insert({
    request_id: request.id,
    signer_id: signerId,
    event_type: eventType || "unknown",
    event_data: evt,
  });
  await logIntegrationEvent({
    companyId: request.company_id,
    providerKey: "docuseal",
    eventType: "inbound_webhook",
    direction: "inbound",
    entityType: "signature_request",
    entityId: request.id,
    payload: { event_type: eventType, submission_id: submissionId },
    success: true,
  });
  return jsonResponse(req, { success: true, event: eventType, request_id: request.id });
}

if (import.meta.main) {
  Deno.serve(handler);
}
