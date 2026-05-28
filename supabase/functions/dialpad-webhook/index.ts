// Dialpad webhook receiver. Verifies HMAC-SHA256(raw body, secret) base64
// against the X-Dialpad-Signature header, then updates dialpad_calls and
// (when matched) logs to client_communications or entity_communications.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logIntegrationEvent } from "../_shared/integrations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dialpad-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("DIALPAD_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const raw = await req.text();
  const signature =
    req.headers.get("x-dialpad-signature") ||
    req.headers.get("X-Dialpad-Signature") ||
    "";

  const ok = await verifySignature(raw, signature, WEBHOOK_SECRET);
  if (!ok) {
    console.warn("dialpad-webhook signature mismatch");
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let evt: any = {};
  try { evt = JSON.parse(raw); } catch { /* keep empty */ }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const callId = String(evt.call_id ?? evt.id ?? "");
  const state = evt.state ?? evt.status ?? null;
  const direction = (evt.direction ?? "").toLowerCase();
  const startedAt = evt.date_started ?? evt.started_at ?? null;
  const endedAt = evt.date_ended ?? evt.ended_at ?? null;
  const duration = evt.duration ?? evt.duration_seconds ?? null;
  const recordingUrl = evt.recording_url ?? evt.recording?.url ?? null;
  const voicemailUrl = evt.voicemail_url ?? null;
  const voicemailTx = evt.voicemail_transcription ?? evt.transcription ?? null;
  const targetPhone = evt.target?.phone ?? evt.to ?? evt.contact?.phone ?? "";

  // Try to resolve company + entity from custom_data (outbound) or by phone match (inbound).
  let companyId: string | null = null;
  let entityType: string | null = null;
  let entityId: string | null = null;
  let staffId: string | null = null;

  const custom = parseCustomData(evt.custom_data);
  if (custom) {
    companyId = custom.company_id ?? null;
    entityType = custom.related_entity_type ?? null;
    entityId = custom.related_entity_id ?? null;
    staffId = custom.staff_id ?? null;
  }

  // Inbound: try to map phone to a known client or lead
  if (direction === "inbound" && !entityId && targetPhone) {
    const phone = String(evt.external_number ?? evt.from?.phone ?? evt.contact?.phone ?? "").trim();
    if (phone) {
      const { data: client } = await admin
        .from("clients").select("id, company_id").eq("phone", phone).limit(1).maybeSingle();
      if (client) { entityType = "client"; entityId = client.id; companyId = client.company_id; }
      if (!entityId) {
        const { data: lead } = await admin
          .from("leads").select("id, company_id").eq("phone", phone).limit(1).maybeSingle();
        if (lead) { entityType = "lead"; entityId = lead.id; companyId = lead.company_id; }
      }
    }
  }

  // Upsert dialpad_calls row
  if (callId) {
    const existing = await admin
      .from("dialpad_calls").select("id, company_id, related_entity_type, related_entity_id, initiated_by")
      .eq("dialpad_call_id", callId).maybeSingle();
    const row: Record<string, unknown> = {
      dialpad_call_id: callId,
      state,
      direction: direction || null,
      duration_seconds: duration,
      recording_url: recordingUrl,
      voicemail_url: voicemailUrl,
      voicemail_transcript: voicemailTx,
      started_at: startedAt,
      ended_at: endedAt,
      raw: evt,
    };
    if (!existing.data) {
      row.target_phone = targetPhone || "";
      row.company_id = companyId;
      row.related_entity_type = entityType;
      row.related_entity_id = entityId;
      row.initiated_by = staffId;
      await admin.from("dialpad_calls").insert(row);
    } else {
      if (!existing.data.related_entity_type && entityType) row.related_entity_type = entityType;
      if (!existing.data.related_entity_id && entityId) row.related_entity_id = entityId;
      await admin.from("dialpad_calls").update(row).eq("dialpad_call_id", callId);

      target_phone: targetPhone || existing.data?.related_entity_id || "",
    };
    if (!existing.data) {
      row.company_id = companyId;
      row.related_entity_type = entityType;
      row.related_entity_id = entityId;
      row.initiated_by = staffId;
      await admin.from("dialpad_calls").insert(row);
    } else {
      // Preserve existing entity mapping unless empty.
      if (!existing.data.related_entity_type && entityType) row.related_entity_type = entityType;
      if (!existing.data.related_entity_id && entityId) row.related_entity_id = entityId;
      await admin.from("dialpad_calls").update(row).eq("dialpad_call_id", callId);
      companyId = companyId ?? existing.data.company_id;
      entityType = existing.data.related_entity_type ?? entityType;
      entityId = existing.data.related_entity_id ?? entityId;
      staffId = staffId ?? existing.data.initiated_by;
    }

    // On terminal states, write to communications tables.
    const terminal = ["hangup", "ended", "completed", "missed", "voicemail"].includes(String(state ?? "").toLowerCase());
    if (terminal && entityType && entityId) {
      const baseNotes = recordingUrl ? `Recording: ${recordingUrl}` : (voicemailTx ?? null);
      if (entityType === "client" || entityType === "lead") {
        // client_communications is keyed to clients only; only log when client
        if (entityType === "client") {
          await admin.from("client_communications").insert({
            client_id: entityId,
            communication_type: "call",
            direction: direction === "inbound" ? "inbound" : "outbound",
            outcome: state ?? "logged",
            duration_minutes: duration ? Math.round(Number(duration) / 60) : null,
            contact_phone: targetPhone,
            notes: baseNotes,
            communication_date: endedAt ?? new Date().toISOString(),
            staff_id: staffId,
          });
        }
      } else if (companyId) {
        await admin.from("entity_communications").insert({
          company_id: companyId,
          entity_type: entityType,
          entity_id: entityId,
          channel: "phone",
          direction: direction === "inbound" ? "inbound" : "outbound",
          subject: `${direction || "call"} – ${state ?? ""}`.trim(),
          body: baseNotes,
          duration_seconds: duration ? Number(duration) : null,
          recording_url: recordingUrl,
          related_record_id: null,
          created_by: staffId,
        });
      }
    }
  }

  await logIntegrationEvent({
    companyId,
    providerKey: "dialpad",
    eventType: `call.${state ?? "event"}`,
    direction: direction === "inbound" ? "inbound" : "outbound",
    entityType,
    entityId,
    success: true,
    payload: { call_id: callId, state },
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function parseCustomData(cd: unknown): Record<string, string> | null {
  if (!cd) return null;
  if (typeof cd === "object") return cd as Record<string, string>;
  try { return JSON.parse(String(cd)); } catch { return null; }
}

async function verifySignature(raw: string, signature: string, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const computed = btoa(String.fromCharCode(...new Uint8Array(mac)));
  // Constant-time-ish compare
  if (computed.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
