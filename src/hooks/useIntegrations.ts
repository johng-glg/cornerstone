import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Json } from "@/integrations/supabase/types";

function useCompanyId(): string | null {
  const { staff } = useAuth();
  return staff?.company_id ?? null;
}

export interface IntegrationProvider {
  id: string;
  provider_key: string;
  display_name: string;
  category: string;
  description: string | null;
  docs_url: string | null;
  icon_key: string | null;
  is_active: boolean;
  default_event_subscriptions: string[];
  auth_method: string;
}

export interface CompanyIntegration {
  id: string;
  company_id: string;
  provider_key: string;
  is_enabled: boolean;
  credentials_vault_ref: string | null;
  config: Record<string, unknown>;
  last_connected_at: string | null;
  last_connection_error: string | null;
  updated_at: string;
}

export interface IntegrationEvent {
  id: string;
  company_id: string | null;
  provider_key: string;
  event_type: string;
  direction: string | null;
  entity_type: string | null;
  entity_id: string | null;
  payload: unknown;
  success: boolean | null;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
}

export function useIntegrationProviders() {
  return useQuery({
    queryKey: ["integration-providers"],
    queryFn: async (): Promise<IntegrationProvider[]> => {
      const { data, error } = await supabase
        .from("integration_providers")
        .select("*")
        .eq("is_active", true)
        .order("display_name");
      if (error) throw error;
      return (data ?? []) as IntegrationProvider[];
    },
  });
}

export function useCompanyIntegrations() {
  const { companyId } = useCompanyType();
  return useQuery({
    queryKey: ["company-integrations", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<CompanyIntegration[]> => {
      const { data, error } = await supabase
        .from("company_integrations")
        .select("*")
        .eq("company_id", companyId!);
      if (error) throw error;
      return (data ?? []) as CompanyIntegration[];
    },
  });
}

export function useUpsertCompanyIntegration() {
  const qc = useQueryClient();
  const { companyId } = useCompanyType();
  return useMutation({
    mutationFn: async (input: {
      provider_key: string;
      is_enabled?: boolean;
      credentials_vault_ref?: string | null;
      config?: Record<string, unknown>;
    }) => {
      if (!companyId) throw new Error("No company in context");
      const { data: existing } = await supabase
        .from("company_integrations")
        .select("id")
        .eq("company_id", companyId)
        .eq("provider_key", input.provider_key)
        .maybeSingle();

      const payload = {
        company_id: companyId,
        provider_key: input.provider_key,
        is_enabled: input.is_enabled ?? false,
        credentials_vault_ref: input.credentials_vault_ref ?? null,
        config: input.config ?? {},
      };

      if (existing) {
        const { error } = await supabase
          .from("company_integrations")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("company_integrations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-integrations"] });
    },
  });
}

export function useIntegrationEvents(providerKey?: string, limit = 50) {
  const { companyId } = useCompanyType();
  return useQuery({
    queryKey: ["integration-events", companyId, providerKey, limit],
    enabled: !!companyId,
    queryFn: async (): Promise<IntegrationEvent[]> => {
      let q = supabase
        .from("integration_event_log")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (providerKey) q = q.eq("provider_key", providerKey);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as IntegrationEvent[];
    },
  });
}
