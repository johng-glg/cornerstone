import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/common/StatCard";
import { QueryState } from "@/components/common/QueryState";
import { AlertsTable } from "@/components/forecast/AlertsTable";
import {
  useClientAlerts,
  useClientEarnedFees,
  useClientTimeline,
  useClientVerdict,
  useFloor,
  useAlertAction,
  useSolve,
} from "@/hooks/useForecast";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ForecastAlertRow, SolverProposal } from "@/lib/forecast-types";

const leverLabel: Record<SolverProposal["lever"], string> = {
  adjust_recurring_draft: "Increase the recurring draft",
  one_time_deposit: "One-time deposit",
};

function ProposalCard({ p }: { p: SolverProposal }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{leverLabel[p.lever]}</span>
        <span className={p.feasible ? "text-xs text-green-700" : "text-xs text-muted-foreground"}>
          {p.feasible ? "Recommended" : "Not feasible"}
        </span>
      </div>
      {p.feasible ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {p.lever === "adjust_recurring_draft"
            ? `+${formatCurrency(p.per_draft_increase ?? 0)} per draft across ${p.drafts_affected} draft(s) — ${formatCurrency(p.total_added ?? 0)} total.`
            : `Deposit ${formatCurrency(p.amount ?? 0)} by ${formatDate(p.effective_by)}.`}{" "}
          Projected trough after: {formatCurrency(p.projected_min_after)}.
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{p.reason}</p>
      )}
    </div>
  );
}

/** Per-client settlement-balance forecast: projection chart, verdict, alerts, earned fees, solver. */
export function ClientForecastTab({ forthContactId }: { forthContactId: number | null }) {
  const timeline = useClientTimeline(forthContactId);
  const verdict = useClientVerdict(forthContactId);
  const alerts = useClientAlerts(forthContactId);
  const earned = useClientEarnedFees(forthContactId);
  const floorQ = useFloor();
  const action = useAlertAction();
  const solve = useSolve();

  const floor = floorQ.data ?? 100;
  const chartData = useMemo(
    () => (timeline.data ?? []).map((p) => ({ date: p.process_date, balance: p.running_balance })),
    [timeline.data],
  );

  if (forthContactId == null) {
    return (
      <p className="text-sm text-muted-foreground">
        This client has no Forth link, so no settlement forecast is available.
      </p>
    );
  }

  const v = verdict.data;
  const breach = !!v?.breach;
  const resolve = (a: ForecastAlertRow) =>
    action.mutate({ id: a.id, status: "resolved", contactId: forthContactId });
  const ack = (a: ForecastAlertRow) =>
    action.mutate({ id: a.id, status: "acknowledged", contactId: forthContactId });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Min projected balance" value={formatCurrency(v?.min_balance ?? null)} />
        <StatCard
          label="Status"
          value={breach ? "Breach" : "OK"}
          sub={breach ? `by ${formatDate(v?.breach_date)}` : `floor ${formatCurrency(floor)}`}
        />
        <StatCard label="Shortfall" value={formatCurrency(v?.additional_needed ?? null)} />
        <StatCard label="Headroom" value={formatCurrency(v?.headroom ?? null)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Projected balance</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={timeline.isLoading}
            error={timeline.error}
            isEmpty={chartData.length === 0}
            emptyMessage="No projected transactions for this client yet."
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={11} minTickGap={24} />
                <YAxis fontSize={11} width={64} tickFormatter={(n) => formatCurrency(Number(n))} />
                <Tooltip formatter={(n) => formatCurrency(Number(n))} />
                <ReferenceLine y={floor} stroke="#dc2626" strokeDasharray="4 4" label="Floor" />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#1e3a5f"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </QueryState>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Suggested fixes</CardTitle>
          <Button
            variant="outline"
            size="sm"
            disabled={solve.isPending}
            onClick={() => solve.mutate(forthContactId)}
          >
            {solve.isPending ? "Solving…" : "Suggest fixes"}
          </Button>
        </CardHeader>
        <CardContent>
          {solve.error && <p className="text-sm text-destructive">{solve.error.message}</p>}
          {solve.data && !solve.data.breach && (
            <p className="text-sm text-muted-foreground">
              No breach to cure — the plan is on track.
            </p>
          )}
          {solve.data?.breach && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Shortfall {formatCurrency(solve.data.shortfall)} below the{" "}
                {formatCurrency(solve.data.floor)} floor. Options (preferred first):
              </p>
              {solve.data.proposals.map((p) => (
                <ProposalCard key={p.lever} p={p} />
              ))}
            </div>
          )}
          {!solve.data && !solve.error && (
            <p className="text-sm text-muted-foreground">
              Run the solver to see deposit / draft options that cure a projected breach.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Breach alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={alerts.isLoading}
            error={alerts.error}
            isEmpty={(alerts.data ?? []).length === 0}
            emptyMessage="No alerts for this client."
          >
            <AlertsTable
              alerts={alerts.data ?? []}
              onAcknowledge={ack}
              onResolve={resolve}
              pendingId={action.isPending ? (action.variables?.id ?? null) : null}
            />
          </QueryState>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Earned fees (AR)</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={earned.isLoading}
            error={earned.error}
            isEmpty={(earned.data ?? []).length === 0}
            emptyMessage="No fees earned yet (earned once a settlement's first creditor payment clears)."
          >
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Offer</th>
                    <th className="px-3 py-2 font-medium">Settled</th>
                    <th className="px-3 py-2 font-medium">Rate</th>
                    <th className="px-3 py-2 font-medium">Fee earned</th>
                    <th className="px-3 py-2 font-medium">Earned on</th>
                  </tr>
                </thead>
                <tbody>
                  {(earned.data ?? []).map((f) => (
                    <tr key={f.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{f.settlement_offer_id}</td>
                      <td className="px-3 py-2">{formatCurrency(f.settled_amount)}</td>
                      <td className="px-3 py-2">{Math.round(f.fee_rate * 100)}%</td>
                      <td className="px-3 py-2">{formatCurrency(f.fee_amount)}</td>
                      <td className="px-3 py-2">{formatDate(f.earned_on)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}
