import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  TenantUsageMetricsRow,
  FeatureFlagCatalogRow,
  TenantFeatureFlagRow,
} from "@/lib/db-types";

/**
 * Phase E — multi-tenant SaaS admin data layer.
 *
 * Reads are RLS-scoped server-side: a tenant admin sees only their own tenant's usage row and
 * flag overrides; a platform admin / service role sees all. Provisioning goes through the
 * `provision-tenant` edge function (platform-admin gated end-to-end).
 */

export const tenantAdminKeys = {
  usage: ["tenant_usage_metrics"] as const,
  flagCatalog: ["feature_flag_catalog"] as const,
  flagOverrides: (companyId: string) => ["tenant_feature_flags", companyId] as const,
};

const USAGE_COLS =
  "company_id, company_name, subdomain, is_active, staff_total, staff_active, calls_total, " +
  "calls_this_month, signatures_total, signatures_this_month, transactions_total, " +
  "transactions_this_month, clients_total";

/** Per-tenant usage rollup. RLS scopes the rows to what the caller may see. */
export function useTenantUsageMetrics(): UseQueryResult<TenantUsageMetricsRow[]> {
  return useQuery({
    queryKey: tenantAdminKeys.usage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_usage_metrics")
        .select(USAGE_COLS)
        .order("company_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TenantUsageMetricsRow[];
    },
  });
}

/** The global feature-flag catalog (every flag, its label, description, and default). */
export function useFeatureFlagCatalog(): UseQueryResult<FeatureFlagCatalogRow[]> {
  return useQuery({
    queryKey: tenantAdminKeys.flagCatalog,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flag_catalog")
        .select("flag_key, label, description, default_enabled, category")
        .order("category", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FeatureFlagCatalogRow[];
    },
  });
}

/** A tenant's feature-flag overrides (rows present only where the tenant differs from default). */
export function useTenantFeatureFlags(companyId: string): UseQueryResult<TenantFeatureFlagRow[]> {
  return useQuery({
    queryKey: tenantAdminKeys.flagOverrides(companyId),
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_feature_flags")
        .select("company_id, flag_key, enabled")
        .eq("company_id", companyId);
      if (error) throw error;
      return (data ?? []) as unknown as TenantFeatureFlagRow[];
    },
  });
}

/** Set (upsert) a per-tenant feature-flag override. Admin-gated by RLS on tenant_feature_flags. */
export function useSetTenantFeatureFlag(): UseMutationResult<
  void,
  Error,
  { companyId: string; flagKey: string; enabled: boolean }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, flagKey, enabled }) => {
      const { error } = await supabase
        .from("tenant_feature_flags")
        .upsert(
          { company_id: companyId, flag_key: flagKey, enabled },
          { onConflict: "company_id,flag_key" },
        );
      if (error) throw error;
    },
    onSuccess: (_data, { companyId }) => {
      qc.invalidateQueries({ queryKey: tenantAdminKeys.flagOverrides(companyId) });
    },
  });
}

export interface ProvisionTenantInput {
  name: string;
  company_type: "law_firm" | "affiliate" | "financing_company";
  subdomain?: string;
  admin_email: string;
  admin_first_name: string;
  admin_last_name: string;
}

export interface ProvisionTenantResult {
  success: boolean;
  company_id?: string;
  admin_user_id?: string;
  message?: string;
  error?: string;
}

/** Provision a new tenant via the platform-admin-gated edge function. */
export function useProvisionTenant(): UseMutationResult<
  ProvisionTenantResult,
  Error,
  ProvisionTenantInput
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke<ProvisionTenantResult>(
        "provision-tenant",
        { body: input },
      );
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Provisioning failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantAdminKeys.usage });
    },
  });
}
