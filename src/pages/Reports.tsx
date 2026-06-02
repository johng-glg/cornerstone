import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLeads, useClientServices } from "@/hooks/useCoreCrm";
import { usePaymentsList } from "@/hooks/useModules";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, titleCase } from "@/lib/format";

const NAVY = "hsl(210 35% 18%)";
const GOLD = "hsl(38 64% 66%)";
const BLUE = "hsl(203 39% 57%)";
const PIE_COLORS = [NAVY, GOLD, BLUE, "#9ca3af", "#86c5a8"];

export default function Reports() {
  const leads = useLeads();
  const services = useClientServices();
  const payments = usePaymentsList();

  const leadsByStatus = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of leads.data ?? []) m.set(l.status, (m.get(l.status) ?? 0) + 1);
    return [...m.entries()].map(([status, count]) => ({ status: titleCase(status), count }));
  }, [leads.data]);

  const plansByType = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of services.data ?? []) {
      const k = s.program_type ?? "—";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].map(([name, value]) => ({ name: titleCase(name), value }));
  }, [services.data]);

  const paymentsByMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments.data ?? []) {
      if (!p.scheduled_date) continue;
      const key = p.scheduled_date.slice(0, 7);
      m.set(key, (m.get(key) ?? 0) + (p.amount ?? 0));
    }
    return [...m.entries()].sort().map(([month, total]) => ({ month, total }));
  }, [payments.data]);

  const totalPayments = (payments.data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Operational analytics across the firm.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Leads" value={leads.data?.length ?? 0} />
        <StatCard label="Engagements" value={services.data?.length ?? 0} />
        <StatCard label="Transactions" value={payments.data?.length ?? 0} />
        <StatCard label="Payment volume" value={formatCurrency(totalPayments)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={leadsByStatus}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="status" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill={NAVY} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagements by program</CardTitle>
          </CardHeader>
          <CardContent>
            {plansByType.length === 0 ? (
              <p className="text-sm text-muted-foreground">No engagements yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={plansByType} dataKey="value" nameKey="name" outerRadius={90} label>
                    {plansByType.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Payment volume by month</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsByMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scheduled payments yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={paymentsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="total" fill={GOLD} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
