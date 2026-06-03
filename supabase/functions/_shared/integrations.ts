// Shared integrations-hub helpers (service-role). Config lookup, enablement gate, event logging.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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

/** Resolve a comma-separated list of env-var names into their values. */
function resolveCredentials(ref: string | null): Record<string, string | undefined> {
  if (!ref) return {};
  const out: Record<string, string | undefined> = {};
  for (const n of ref
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean))
    out[n] = Deno.env.get(n);
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
  return {
    ...(data as IntegrationConfigRow),
    credentials: resolveCredentials(data.credentials_vault_ref),
  };
}

export async function requireIntegrationEnabled(
  companyId: string | null,
  providerKey: string,
): Promise<IntegrationConfigRow> {
  const row = await getIntegrationConfig(companyId, providerKey);
  if (!row || !row.is_enabled) throw new Error(`Integration disabled: ${providerKey}`);
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
    await admin()
      .from("integration_event_log")
      .insert({
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
    console.error("logIntegrationEvent failed", e);
  }
}
