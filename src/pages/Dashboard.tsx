import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/lib/auth";
import { useClients, useLeads, useLiabilities, useTransactions } from "@/hooks/useCoreCrm";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, titleCase } from "@/lib/format";

// Role → the pages that role works in most. Drives the dashboard quick actions.
const ROLE_ACTIONS: Record<string, { label: string; to: string }[]> = {
  admin: [
    { label: "Leads", to: "/leads" },
    { label: "Reports", to: "/reports" },
    { label: "Staff", to: "/staff" },
    { label: "Settings", to: "/settings" },
  ],
  attorney: [
    { label: "Litigation", to: "/litigation" },
    { label: "Court Calendar", to: "/court-calendar" },
    { label: "Tasks", to: "/tasks" },
  ],
  paralegal: [
    { label: "Litigation", to: "/litigation" },
    { label: "Court Calendar", to: "/court-calendar" },
    { label: "Tasks", to: "/tasks" },
  ],
  sales_rep: [
    { label: "Leads", to: "/leads" },
    { label: "Eligibility Reviews", to: "/eligibility-reviews" },
    { label: "Lead Metrics", to: "/lead-metrics" },
  ],
  negotiator: [
    { label: "Liabilities", to: "/liabilities" },
    { label: "Creditors", to: "/creditors" },
    { label: "Clients", to: "/clients" },
  ],
  payment_processor: [
    { label: "Payments", to: "/payments" },
    { label: "Transactions", to: "/transactions" },
    { label: "Billing", to: "/billing" },
  ],
  correspondent: [
    { label: "Templates", to: "/templates" },
    { label: "Signatures", to: "/signatures" },
    { label: "Clients", to: "/clients" },
  ],
  case_manager: [
    { label: "Clients", to: "/clients" },
    { label: "Engagements", to: "/engagements" },
    { label: "Tasks", to: "/tasks" },
  ],
  client_services_rep: [
    { label: "Clients", to: "/clients" },
    { label: "Engagements", to: "/engagements" },
    { label: "Tasks", to: "/tasks" },
  ],
  viewer: [
    { label: "Reports", to: "/reports" },
    { label: "Clients", to: "/clients" },
  ],
};

export default function Dashboard() {
  const { staff, roles } = useAuth();
  const primaryRole = roles[0] ?? "viewer";
  const actions = ROLE_ACTIONS[primaryRole] ?? ROLE_ACTIONS.viewer;
  const clients = useClients();
  const leads = useLeads();
  const liabilities = useLiabilities();
  const transactions = useTransactions();

  const leadRows = leads.data ?? [];
  const liabilityRows = liabilities.data ?? [];

  const openLeads = leadRows.filter((l) => l.status !== "converted" && l.status !== "lost").length;
  const pipelineDebt = leadRows.reduce((sum, l) => sum + (l.estimated_debt_amount ?? 0), 0);
  const enrolledBalance = liabilityRows.reduce((sum, l) => sum + (l.enrolled_balance ?? 0), 0);

  const leadsByStatus = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of leads.data ?? []) counts.set(l.status, (counts.get(l.status) ?? 0) + 1);
    return [...counts.entries()].map(([status, count]) => ({ status: titleCase(status), count }));
  }, [leads.data]);

  const loading = clients.isLoading || leads.isLoading || liabilities.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome{staff ? `, ${staff.first_name}` : ""}.
            <span className="ml-1 text-xs">({titleCase(primaryRole)})</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-muted"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Clients" value={loading ? "…" : (clients.data?.length ?? 0)} />
        <StatCard
          label="Open leads"
          value={loading ? "…" : openLeads}
          sub={`${leadRows.length} total`}
        />
        <StatCard
          label="Pipeline debt"
          value={loading ? "…" : formatCurrency(pipelineDebt)}
          sub="Estimated, from leads"
        />
        <StatCard
          label="Enrolled balance"
          value={loading ? "…" : formatCurrency(enrolledBalance)}
          sub={`${liabilityRows.length} liabilities`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads by status</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsByStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={leadsByStatus}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="status" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {transactions.data?.length ?? 0} transactions on record.
      </p>
    </div>
  );
}
