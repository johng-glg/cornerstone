// dialpad-webhook — HMAC-verified inbound Dialpad events. Upserts dialpad_calls, links inbound
// calls to a client/lead by phone, and on terminal states appends a call activity to
// client_communications (client surface) or entity_communications (polymorphic).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { enforceRateLimit, clientIp } from "../_shared/rateLimit.ts";
import { verifyHmacSha256Base64 } from "../_shared/hmac.ts";
import { looksLikeJwt, verifyHs256Jwt } from "../_shared/jwt.ts";
import { logIntegrationEvent } from "../_shared/integrations.ts";
import {
  normalizeE164,
  parseCustomData,
  isTerminalState,
  commsTargetTable,
  formatCallSummary,
} from "../_shared/dialpad.ts";

// Dialpad event payloads vary by event type; validate that it's a JSON object and let the
// known fields through while tolerating unknown keys (passthrough). HMAC is the trust boundary.
const EvtSchema = z.object({}).passthrough();
// deno-lint-ignore no-explicit-any
type Evt = Record<string, any>;

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  // Unauthenticated endpoint: rate-limit by source IP before HMAC to blunt signature brute-force.
  const limited = await enforceRateLimit(req, {
    bucket: "dialpad-webhook",
    identifier: clientIp(req),
    maxRequests: 120,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const raw = await req.text();
  const secret = Deno.env.get("DIALPAD_WEBHOOK_SECRET") ?? "";

  // Dialpad signs events as an HS256 JWT (the body *is* the token) when a secret is set; the
  // claims are the event. The legacy/mock path is raw JSON + a base64 HMAC in x-dialpad-signature.
  // Either proves authenticity; anything else is rejected. HMAC/JWT is the trust boundary.
  let evt: Evt | null = null;
  const trimmed = raw.trim();
  if (looksLikeJwt(trimmed)) {
    const payload = await verifyHs256Jwt(trimmed, secret);
    if (payload) {
      const parsed = EvtSchema.safeParse(payload);
      if (parsed.success) evt = parsed.data as Evt;
    }
  }
  if (evt === null) {
    const signature =
      req.headers.get("x-dialpad-signature") ?? req.headers.get("X-Dialpad-Signature") ?? "";
    if (signature && (await verifyHmacSha256Base64(raw, secret, signature))) {
      try {
        const parsed = EvtSchema.safeParse(JSON.parse(raw));
        if (parsed.success) evt = parsed.data as Evt;
      } catch {
        /* tolerate non-JSON / malformed bodies */
      }
    }
  }
  if (evt === null) {
    await logIntegrationEvent({
      providerKey: "dialpad",
      eventType: "inbound_webhook",
      direction: "inbound",
      success: false,
      errorMessage: "invalid signature",
    });
    return jsonResponse(req, { error: "invalid signature" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const callId = String(evt.call_id ?? evt.id ?? "");
  if (!callId) return jsonResponse(req, { success: true, skipped: "no call id" });

  const state = evt.state ?? evt.status ?? null;
  const direction = String(evt.direction ?? "").toLowerCase();
  const duration = evt.duration_seconds ?? evt.duration ?? null;
  const recordingUrl = evt.recording_url ?? evt.recording?.url ?? null;
  const voicemailTx = evt.voicemail_transcription ?? evt.transcription ?? null;
  const targetPhone = evt.target?.phone ?? evt.to ?? evt.contact?.phone ?? "";

  const custom = parseCustomData(evt.custom_data);
  let companyId: string | null = custom?.company_id ?? null;
  let entityType: string | null = custom?.related_entity_type ?? null;
  let entityId: string | null = custom?.related_entity_id ?? null;
  const staffId: string | null = custom?.staff_id ?? null;

  // Inbound + unlinked → match by phone (clients, then leads).
  if (direction === "inbound" && !entityId) {
    const phone = normalizeE164(
      evt.external_number ?? evt.from?.phone ?? evt.contact?.phone ?? targetPhone,
    );
    if (phone) {
      const { data: client } = await admin
        .from("clients")
        .select("id, company_id")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();
      if (client) {
        entityType = "client";
        entityId = client.id;
        companyId = client.company_id;
      } else {
        const { data: lead } = await admin
          .from("leads")
          .select("id, company_id")
          .eq("phone", phone)
          .limit(1)
          .maybeSingle();
        if (lead) {
          entityType = "lead";
          entityId = lead.id;
          companyId = lead.company_id;
        }
      }
    }
  }

  const row: Record<string, unknown> = {
    dialpad_call_id: callId,
    state,
    direction: direction || null,
    duration_seconds: duration,
    recording_url: recordingUrl,
    voicemail_transcript: voicemailTx,
    started_at: evt.date_started ?? evt.started_at ?? null,
    ended_at: evt.date_ended ?? evt.ended_at ?? null,
    raw: evt,
  };
  const { data: existing } = await admin
    .from("dialpad_calls")
    .select("id, company_id, related_entity_type, related_entity_id, initiated_by")
    .eq("dialpad_call_id", callId)
    .maybeSingle();

  let callRowId = existing?.id ?? null;
  if (!existing) {
    row.target_phone = targetPhone || "";
    row.company_id = companyId;
    row.related_entity_type = entityType;
    row.related_entity_id = entityId;
    row.initiated_by = staffId;
    const { data: ins } = await admin.from("dialpad_calls").insert(row).select("id").maybeSingle();
    callRowId = ins?.id ?? null;
  } else {
    if (entityType && !existing.related_entity_type) row.related_entity_type = entityType;
    if (entityId && !existing.related_entity_id) row.related_entity_id = entityId;
    await admin.from("dialpad_calls").update(row).eq("dialpad_call_id", callId);
    companyId = companyId ?? existing.company_id;
    entityType = existing.related_entity_type ?? entityType;
    entityId = existing.related_entity_id ?? entityId;
  }

  // On terminal state, append a call activity to the right comms table.
  if (isTerminalState(state) && entityType && entityId) {
    const isVoicemail = String(state).toLowerCase() === "voicemail" || !!voicemailTx;
    const summary = formatCallSummary(direction, duration, isVoicemail);
    if (commsTargetTable(entityType) === "client_communications") {
      await admin.from("client_communications").insert({
        client_id: entityId,
        communication_type: "call",
        direction: direction || "outbound",
        subject: summary,
        notes: voicemailTx ?? (recordingUrl ? `Recording: ${recordingUrl}` : null),
        duration_minutes: duration != null ? Math.round(Number(duration) / 60) : null,
        staff_id: staffId,
        communication_date: new Date().toISOString(),
      });
    } else {
      await admin.from("entity_communications").insert({
        company_id: companyId,
        entity_type: entityType,
        entity_id: entityId,
        channel: "call",
        direction: direction || "outbound",
        subject: summary,
        body: voicemailTx ?? null,
        duration_seconds: duration,
        recording_url: recordingUrl,
        related_record_id: callRowId,
        created_by: staffId,
      });
    }
  }

  await logIntegrationEvent({
    companyId,
    providerKey: "dialpad",
    eventType: "inbound_webhook",
    direction: "inbound",
    entityType,
    entityId,
    payload: { call_id: callId, state },
    success: true,
  });
  return jsonResponse(req, {
    success: true,
    call_id: callId,
    linked: entityType ? `${entityType}:${entityId}` : null,
  });
}

if (import.meta.main) {
  Deno.serve(handler);
}
