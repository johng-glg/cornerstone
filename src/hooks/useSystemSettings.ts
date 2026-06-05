// Read/write global engine config in public.system_setting (forecasting thresholds). Reads are open
// to authenticated users (RLS); writes are admin-only (RLS policy added 20260605160000).
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** The engine config keys surfaced in Settings. */
export const ENGINE_SETTING_KEYS = [
  "min_balance_floor",
  "incidental_buffer_per_payment",
  "default_fee_rate",
  "alert_horizon_days",
] as const;
export type EngineSettingKey = (typeof ENGINE_SETTING_KEYS)[number];

export function useSystemSettings(): UseQueryResult<Record<string, string>, Error> {
  return useQuery({
    queryKey: ["system_setting"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_setting").select("key, value");
      if (error) throw new Error(error.message);
      const map: Record<string, string> = {};
      for (const r of data ?? [])
        map[(r as { key: string }).key] = (r as { value: string }).value ?? "";
      return map;
    },
  });
}

export function useUpdateSystemSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entries: { key: string; value: string }[]) => {
      const { data: auth } = await supabase.auth.getUser();
      const rows = entries.map((e) => ({
        key: e.key,
        value: e.value,
        updated_at: new Date().toISOString(),
        updated_by: auth.user?.id ?? null,
      }));
      const { error } = await supabase.from("system_setting").upsert(rows, { onConflict: "key" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system_setting"] });
      qc.invalidateQueries({ queryKey: ["forecast", "floor"] });
    },
  });
}
