import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/lib/auth";
import { useClients, useLeads, useLiabilities } from "@/hooks/useCoreCrm";
import { useLitigationMatters } from "@/hooks/useDomains";
import { useTasksList, useEligibilityReviews, usePaymentsList } from "@/hooks/useModules";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

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
  of_counsel: [
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

type Stat = { label: string; value: string | number; sub?: string };

const LEGAL_ROLES = new Set(["attorney", "paralegal", "of_counsel"]);
const CLOSED_MATTER = new Set(["settled", "dismissed", "declined", "dropped"]);

export default function Dashboard() {
  const { staff, roles, impersonatedView } = useAuth();
  const role = roles[0] ?? "viewer";
  const actions = ROLE_ACTIONS[role] ?? ROLE_ACTIONS.viewer;

  const clients = useClients();
  const leads = useLeads();
  const liabilities = useLiabilities();
  const matters = useLitigationMatters();
  const tasks = useTasksList();
  const eligibility = useEligibilityReviews();
  const payments = usePaymentsList();

  const m = useMemo(() => {
    const now = Date.now();
    const leadRows = leads.data ?? [];
    const liabRows = liabilities.data ?? [];
    const matterRows = matters.data ?? [];
    const isFuture = (d: string | null) => !!d && new Date(d).getTime() >= now;
    return {
      clients: clients.data?.length ?? 0,
      openLeads: leadRows.filter((l) => l.status !== "converted" && l.status !== "lost").length,
      totalLeads: leadRows.length,
      pipelineDebt: leadRows.reduce((s, l) => s + (l.estimated_debt_amount ?? 0), 0),
      converted: leadRows.filter((l) => l.status === "converted").length,
      enrolledBalance: liabRows.reduce((s, l) => s + (l.enrolled_balance ?? 0), 0),
      inNegotiation: liabRows.filter((l) => l.status === "in_negotiation").length,
      settled: liabRows.filter((l) => l.status === "settled").length,
      matters: matterRows.length,
      upcomingHearings: matterRows.filter((r) => isFuture(r.next_hearing_date)).length,
      openDeadlines: matterRows.filter((r) => r.response_deadline && !CLOSED_MATTER.has(r.status))
        .length,
      openTasks: (tasks.data ?? []).filter(
        (t) => t.status !== "completed" && t.status !== "cancelled",
      ).length,
      eligibilityPending: (eligibility.data ?? []).filter((e) => e.status === "pending").length,
      paymentsPending: (payments.data ?? []).filter(
        (p) => p.status === "scheduled" || p.status === "pending",
      ).length,
      transactions: payments.data?.length ?? 0,
    };
  }, [
    clients.data,
    leads.data,
    liabilities.data,
    matters.data,
    tasks.data,
    eligibility.data,
    payments.data,
  ]);

  const cards: Stat[] = useMemo(() => {
    switch (role) {
      case "sales_rep":
        return [
          { label: "Open leads", value: m.openLeads, sub: `${m.totalLeads} total` },
          { label: "Pipeline debt", value: formatCurrency(m.pipelineDebt), sub: "Estimated" },
          { label: "Eligibility pending", value: m.eligibilityPending, sub: "Awaiting review" },
          { label: "Converted", value: m.converted, sub: "Leads → clients" },
        ];
      case "attorney":
      case "paralegal":
      case "of_counsel":
        return [
          { label: "Litigation matters", value: m.matters },
          { label: "Upcoming hearings", value: m.upcomingHearings, sub: "Scheduled ahead" },
          { label: "Open deadlines", value: m.openDeadlines, sub: "Response due" },
          { label: "Open tasks", value: m.openTasks },
        ];
      case "negotiator":
        return [
          { label: "In negotiation", value: m.inNegotiation, sub: "Liabilities" },
          { label: "Settled", value: m.settled, sub: "Liabilities" },
          { label: "Enrolled balance", value: formatCurrency(m.enrolledBalance) },
          { label: "Litigation matters", value: m.matters },
        ];
      case "payment_processor":
        return [
          { label: "Payments pending", value: m.paymentsPending, sub: "Scheduled / pending" },
          { label: "Transactions", value: m.transactions, sub: "On record" },
          { label: "Enrolled balance", value: formatCurrency(m.enrolledBalance) },
          { label: "Clients", value: m.clients },
        ];
      case "case_manager":
      case "client_services_rep":
        return [
          { label: "Clients", value: m.clients },
          { label: "Open tasks", value: m.openTasks },
          { label: "In negotiation", value: m.inNegotiation, sub: "Liabilities" },
          { label: "Enrolled balance", value: formatCurrency(m.enrolledBalance) },
        ];
      case "correspondent":
        return [
          { label: "Clients", value: m.clients },
          { label: "Open tasks", value: m.openTasks },
          { label: "Open leads", value: m.openLeads },
          { label: "Settled", value: m.settled, sub: "Liabilities" },
        ];
      default: // admin, viewer
        return [
          { label: "Clients", value: m.clients },
          { label: "Open leads", value: m.openLeads, sub: `${m.totalLeads} total` },
          { label: "Pipeline debt", value: formatCurrency(m.pipelineDebt), sub: "From leads" },
          { label: "Enrolled balance", value: formatCurrency(m.enrolledBalance) },
        ];
    }
  }, [role, m]);

  const leadsByStatus = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of leads.data ?? []) counts.set(l.status, (counts.get(l.status) ?? 0) + 1);
    return [...counts.entries()].map(([status, count]) => ({ status: titleCase(status), count }));
  }, [leads.data]);

  const upcomingDeadlines = useMemo(
    () =>
      (matters.data ?? [])
        .filter((r) => r.response_deadline && !CLOSED_MATTER.has(r.status))
        .sort((a, b) => (a.response_deadline ?? "").localeCompare(b.response_deadline ?? ""))
        .slice(0, 6),
    [matters.data],
  );

  const showDeadlines = LEGAL_ROLES.has(role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome{staff ? `, ${staff.first_name}` : ""}.
            <span className="ml-1 text-xs">({titleCase(role)})</span>
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

      {impersonatedView && (
        <div className="rounded-md border border-guardian-gold/40 bg-guardian-gold/10 px-3 py-2 text-sm">
          Previewing the dashboard as <span className="font-medium">{titleCase(role)}</span>. Change
          or clear this with the “View as” menu in the top bar.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} sub={c.sub} />
        ))}
      </div>

      {showDeadlines ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming response deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open matters with deadlines.</p>
            ) : (
              <ul className="divide-y">
                {upcomingDeadlines.map((r) => {
                  const overdue =
                    !!r.response_deadline && new Date(r.response_deadline).getTime() < Date.now();
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <Link to={`/litigation/${r.id}`} className="hover:underline">
                        {r.case_number || r.opposing_party || "Matter"}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {titleCase(r.status)}
                        </span>
                      </Link>
                      <span
                        className={
                          overdue
                            ? "text-xs font-medium text-destructive"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {overdue ? "Overdue · " : ""}
                        {formatDate(r.response_deadline)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
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
      )}
    </div>
  );
}
