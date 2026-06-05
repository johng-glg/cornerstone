// React Query hooks for the settlement forecasting engine UI.
// Reads come straight from the engine tables (RLS scopes them to the user's company); live
// projection + solver come from the forecast-engine edge function / SQL RPCs. Alerts are keyed by
// Forth contact_id, so we resolve them to Cornerstone clients via clients.forth_crm_id.
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { compareAlerts } from "@/components/forecast/severity";
import type {
  AlertStatus,
  EarnedFeeRow,
  ForecastAlertRow,
  ForecastAlertWithClient,
  ProjectionRunRow,
  SolverResult,
  TimelinePoint,
  Verdict,
} from "@/lib/forecast-types";

export const forecastKeys = {
  openAlerts: ["forecast", "open-alerts"] as const,
  projection: (c: number) => ["forecast", "projection", c] as const,
  alerts: (c: number) => ["forecast", "alerts", c] as const,
  earnedFees: (c: number) => ["forecast", "earned-fees", c] as const,
  timeline: (c: number) => ["forecast", "timeline", c] as const,
  verdict: (c: number) => ["forecast", "verdict", c] as const,
  floor: ["forecast", "floor"] as const,
};

const enabledContact = (c: number | null | undefined): c is number =>
  c != null && Number.isFinite(c);

/** Firm-wide open/acknowledged breach alerts, triage-sorted and linked to their client. */
export function useOpenAlerts(): UseQueryResult<ForecastAlertWithClient[], Error> {
  return useQuery({
    queryKey: forecastKeys.openAlerts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_alert")
        .select("*")
        .in("status", ["open", "acknowledged"]);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as ForecastAlertRow[];

      const contactIds = [...new Set(rows.map((r) => String(r.contact_id)))];
      const byContact = new Map<string, { id: string; name: string }>();
      if (contactIds.length) {
        const { data: clients } = await supabase
          .from("clients")
          .select("id, first_name, last_name, forth_crm_id")
          .in("forth_crm_id", contactIds);
        for (const c of clients ?? []) {
          byContact.set(String(c.forth_crm_id), {
            id: c.id,
            name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
          });
        }
      }
      return rows
        .map((r) => ({
          ...r,
          client_id: byContact.get(String(r.contact_id))?.id ?? null,
          client_name: byContact.get(String(r.contact_id))?.name ?? null,
        }))
        .sort(compareAlerts);
    },
  });
}

export function useClientProjection(
  contactId: number | null | undefined,
): UseQueryResult<ProjectionRunRow | null, Error> {
  return useQuery({
    queryKey: forecastKeys.projection(contactId ?? -1),
    enabled: enabledContact(contactId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projection_run")
        .select("*")
        .eq("contact_id", contactId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as ProjectionRunRow | null;
    },
  });
}

export function useClientAlerts(
  contactId: number | null | undefined,
): UseQueryResult<ForecastAlertRow[], Error> {
  return useQuery({
    queryKey: forecastKeys.alerts(contactId ?? -1),
    enabled: enabledContact(contactId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_alert")
        .select("*")
        .eq("contact_id", contactId!);
      if (error) throw new Error(error.message);
      return ((data ?? []) as ForecastAlertRow[]).sort(compareAlerts);
    },
  });
}

export function useClientEarnedFees(
  contactId: number | null | undefined,
): UseQueryResult<EarnedFeeRow[], Error> {
  return useQuery({
    queryKey: forecastKeys.earnedFees(contactId ?? -1),
    enabled: enabledContact(contactId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("earned_fee_ar")
        .select("*")
        .eq("contact_id", contactId!)
        .order("earned_on", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as EarnedFeeRow[];
    },
  });
}

/** Live projected-balance timeline for the chart (SQL RPC; RLS-scoped). */
export function useClientTimeline(
  contactId: number | null | undefined,
): UseQueryResult<TimelinePoint[], Error> {
  return useQuery({
    queryKey: forecastKeys.timeline(contactId ?? -1),
    enabled: enabledContact(contactId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_project_balance", {
        p_contact_id: contactId!,
        p_prospective_offer_ids: null,
        p_floor: null,
        p_incidental: null,
      });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: Record<string, unknown>) => ({
        process_date: String(r.process_date),
        net_amount: Number(r.net_amount),
        record_source: String(r.record_source),
        running_balance: Number(r.running_balance),
      })) as TimelinePoint[];
    },
  });
}

export function useClientVerdict(
  contactId: number | null | undefined,
): UseQueryResult<Verdict | null, Error> {
  return useQuery({
    queryKey: forecastKeys.verdict(contactId ?? -1),
    enabled: enabledContact(contactId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_project_verdict", {
        p_contact_id: contactId!,
        p_prospective_offer_ids: null,
        p_floor: null,
        p_incidental: null,
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as Verdict | null;
    },
  });
}

export function useFloor(): UseQueryResult<number, Error> {
  return useQuery({
    queryKey: forecastKeys.floor,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_setting")
        .select("value")
        .eq("key", "min_balance_floor")
        .maybeSingle();
      if (error) throw new Error(error.message);
      const n = data?.value != null ? Number(data.value) : NaN;
      return Number.isFinite(n) ? n : 100;
    },
  });
}

/** Acknowledge or resolve an alert; refreshes the queue + that client's alert list. */
export function useAlertAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AlertStatus; contactId?: number }) => {
      const { error } = await supabase
        .from("forecast_alert")
        .update({
          status,
          resolved_at: status === "resolved" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: forecastKeys.openAlerts });
      if (vars.contactId != null) {
        qc.invalidateQueries({ queryKey: forecastKeys.alerts(vars.contactId) });
      }
    },
  });
}

/** Pull a client's Forth transactions + offers into the mirror, then refresh the forecast. */
export function useMirrorSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke("forth-mirror-sync", {
        body: { client_id: clientId },
      });
      // Surface the real reason: a 5xx carries it in error.context; a 200 with success:false
      // carries per-client failures in errors[] (don't bury them behind a generic message).
      if (error) {
        let msg = error.message;
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = (await ctx.json()) as { error?: string };
            if (body?.error) msg = body.error;
          } catch {
            /* keep error.message */
          }
        }
        throw new Error(msg);
      }
      const d = data as {
        success?: boolean;
        error?: string;
        errors?: { client_id: string; error: string }[];
      } | null;
      if (d?.success === false) {
        throw new Error(d.errors?.[0]?.error ?? d.error ?? "Sync failed");
      }
      return d;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forecast"] }),
  });
}

/** Run the §9 modification solver for a client (forecast-engine edge function). */
export function useSolve() {
  return useMutation({
    mutationFn: async (contactId: number): Promise<SolverResult> => {
      const { data, error } = await supabase.functions.invoke("forecast-engine", {
        body: { action: "solve", contact_id: contactId },
      });
      const d = data as ({ success?: boolean; error?: string } & SolverResult) | null;
      if (error || d?.success === false) {
        throw new Error(error?.message ?? d?.error ?? "Solver failed");
      }
      return d as SolverResult;
    },
  });
}
