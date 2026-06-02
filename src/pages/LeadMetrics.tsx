import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useLeads } from "@/hooks/useCoreCrm";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { titleCase, formatCurrency } from "@/lib/format";

export default function LeadMetrics() {
  const { data, isLoading } = useLeads();
  const rows = useMemo(() => data ?? [], [data]);
  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of rows) m.set(l.status, (m.get(l.status) ?? 0) + 1);
    return [...m.entries()];
  }, [rows]);

  const total = rows.length;
  const converted = rows.filter((l) => l.status === "converted").length;
  const convRate = total ? Math.round((converted / total) * 100) : 0;
  const avgScore = total
    ? Math.round(rows.reduce((s, l) => s + (l.lead_score ?? 0), 0) / total)
    : 0;
  const pipeline = rows.reduce((s, l) => s + (l.estimated_debt_amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lead Metrics</h1>
        <Link to="/lead-rules" className="text-sm text-guardian-gold hover:underline">
          Assignment rules
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total leads" value={isLoading ? "…" : total} />
        <StatCard
          label="Conversion rate"
          value={isLoading ? "…" : `${convRate}%`}
          sub={`${converted} converted`}
        />
        <StatCard label="Avg lead score" value={isLoading ? "…" : avgScore} />
        <StatCard label="Pipeline debt" value={isLoading ? "…" : formatCurrency(pipeline)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads by status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {byStatus.map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <span className="w-28 text-sm text-muted-foreground">{titleCase(status)}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full bg-guardian-gold"
                    style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm">{count}</span>
              </div>
            ))}
            {byStatus.length === 0 && (
              <p className="text-sm text-muted-foreground">No leads yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
