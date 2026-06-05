import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/common/StatCard";
import { QueryState } from "@/components/common/QueryState";
import { AlertsTable } from "@/components/forecast/AlertsTable";
import { useOpenAlerts, useAlertAction } from "@/hooks/useForecast";
import { formatCurrency } from "@/lib/format";
import type { ForecastAlertRow } from "@/lib/forecast-types";

/** Firm-wide early-warning queue: open breach alerts across all clients, triage-sorted. */
export default function EarlyWarning() {
  const alerts = useOpenAlerts();
  const action = useAlertAction();

  const rows = useMemo(() => alerts.data ?? [], [alerts.data]);
  const stats = useMemo(() => {
    const critical = rows.filter((r) => r.severity === "critical").length;
    const exposure = rows.reduce((s, r) => s + (r.shortfall_amount ?? 0), 0);
    const soonest = rows
      .map((r) => r.breach_date)
      .filter((d): d is string => !!d)
      .sort()[0];
    return { total: rows.length, critical, exposure, soonest };
  }, [rows]);

  const ack = (a: ForecastAlertRow) =>
    action.mutate({ id: a.id, status: "acknowledged", contactId: a.contact_id });
  const resolve = (a: ForecastAlertRow) =>
    action.mutate({ id: a.id, status: "resolved", contactId: a.contact_id });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Early Warning</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open settlement-balance breach alerts across all clients, most urgent first.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open alerts" value={stats.total} />
        <StatCard label="Critical" value={stats.critical} />
        <StatCard label="Total shortfall" value={formatCurrency(stats.exposure)} />
        <StatCard label="Soonest breach" value={stats.soonest ?? "—"} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Alert queue</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={alerts.isLoading}
            error={alerts.error}
            isEmpty={rows.length === 0}
            emptyMessage="No open breach alerts. 🎉"
          >
            <AlertsTable
              alerts={rows}
              showClient
              onAcknowledge={ack}
              onResolve={resolve}
              pendingId={action.isPending ? (action.variables?.id ?? null) : null}
            />
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}
