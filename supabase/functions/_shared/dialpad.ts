// Pure Dialpad helpers (no I/O) — phone normalization, custom-data parsing, call-state and
// communication-log routing. Unit-tested under `deno test`.

/** Normalize a phone to E.164 (US default) for matching against clients/leads/creditor_contacts. */
export function normalizeE164(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.trim().startsWith("+")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

export interface DialpadCustomData {
  company_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  staff_id?: string;
}

/** custom_data may arrive as an object or a JSON string; parse defensively. */
export function parseCustomData(cd: unknown): DialpadCustomData | null {
  if (!cd) return null;
  let obj: unknown = cd;
  if (typeof cd === "string") {
    try {
      obj = JSON.parse(cd);
    } catch {
      return null;
    }
  }
  if (typeof obj !== "object" || obj === null) return null;
  return obj as DialpadCustomData;
}

const TERMINAL_STATES = new Set(["hangup", "ended", "completed", "missed", "voicemail"]);

export function isTerminalState(state: string | null | undefined): boolean {
  return TERMINAL_STATES.has(String(state ?? "").toLowerCase());
}

/**
 * Which communication-log table a call activity is appended to:
 * client surfaces → client_communications (legacy client-only), everything else → the
 * polymorphic entity_communications.
 */
export function commsTargetTable(
  entityType: string | null | undefined,
): "client_communications" | "entity_communications" {
  return entityType === "client" ? "client_communications" : "entity_communications";
}

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Human auto-summary, e.g. "Outbound call · 2:14 · Voicemail". */
export function formatCallSummary(
  direction: string | null | undefined,
  durationSeconds: number | null | undefined,
  isVoicemail = false,
): string {
  const dir = direction === "inbound" ? "Inbound call" : "Outbound call";
  const parts = [dir];
  if (durationSeconds != null && durationSeconds > 0) parts.push(mmss(durationSeconds));
  if (isVoicemail) parts.push("Voicemail");
  return parts.join(" · ");
}
