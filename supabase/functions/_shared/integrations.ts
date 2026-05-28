// Shared helpers for the Integrations Hub (Phase 11).
// - getIntegrationConfig: returns the company_integrations row plus the secret value
//   referenced by credentials_vault_ref (resolved from edge-function env vars).
// - logIntegrationEvent: writes a row to integration_event_log via service role.
// - requireIntegrationEnabled: throws when the integration is disabled for the company.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export interface IntegrationConfigRow {
  id: string;
  company_id: string;
  provider_key: string;
  is_enabled: boolean;
  credentials_vault_ref: string | null;
  config: Record<string, unknown>;
  credentials?: Record<string, string | undefined>;
}

/** Resolve a credentials reference into the actual env-var values. */
function resolveCredentials(ref: string | null): Record<string, string | undefined> {
  if (!ref) return {};
  // ref may be a single env name or a comma-separated list (e.g. "FORTH_CLIENT_ID,FORTH_API_KEY").
  const names = ref.split(",").map((s) => s.trim()).filter(Boolean);
  const out: Record<string, string | undefined> = {};
  for (const n of names) out[n] = Deno.env.get(n);
  return out;
}

export async function getIntegrationConfig(
  companyId: string | null,
  providerKey: string,
): Promise<IntegrationConfigRow | null> {
  if (!companyId) return null;
  const { data, error } = await admin()
    .from("company_integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider_key", providerKey)
    .maybeSingle();
  if (error || !data) return null;
  return { ...(data as IntegrationConfigRow), credentials: resolveCredentials(data.credentials_vault_ref) };
}

export async function requireIntegrationEnabled(
  companyId: string | null,
  providerKey: string,
): Promise<IntegrationConfigRow> {
  const row = await getIntegrationConfig(companyId, providerKey);
  if (!row || !row.is_enabled) {
    throw new Error(`Integration disabled: ${providerKey}`);
  }
  return row;
}

export interface LogIntegrationEventInput {
  companyId?: string | null;
  providerKey: string;
  eventType: string;
  direction?: "outbound" | "inbound" | null;
  entityType?: string | null;
  entityId?: string | null;
  payload?: unknown;
  success?: boolean;
  errorMessage?: string | null;
  latencyMs?: number | null;
}

export async function logIntegrationEvent(input: LogIntegrationEventInput): Promise<void> {
  try {
    await admin().from("integration_event_log").insert({
      company_id: input.companyId ?? null,
      provider_key: input.providerKey,
      event_type: input.eventType,
      direction: input.direction ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      payload: input.payload ?? null,
      success: input.success ?? null,
      error_message: input.errorMessage ?? null,
      latency_ms: input.latencyMs ?? null,
    });
  } catch (e) {
    // Never let logging failure break the caller.
    console.error("logIntegrationEvent failed", e);
  }
}

/** Mark the company_integrations row as just-connected (or with an error). */
export async function recordConnectionAttempt(
  companyId: string,
  providerKey: string,
  ok: boolean,
  errorMessage?: string | null,
): Promise<void> {
  try {
    await admin()
      .from("company_integrations")
      .update({
        last_connected_at: ok ? new Date().toISOString() : null,
        last_connection_error: ok ? null : (errorMessage ?? "Unknown error"),
      })
      .eq("company_id", companyId)
      .eq("provider_key", providerKey);
  } catch (e) {
    console.error("recordConnectionAttempt failed", e);
  }
}
