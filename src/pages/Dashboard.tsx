import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  DollarSign,
  FileText,
  Gavel,
  Handshake,
  LayoutDashboard,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useClients, useLeads, useLiabilities, useClientServices } from "@/hooks/useCoreCrm";
import { useLitigationMatters } from "@/hooks/useDomains";
import { useTasksList, useStaffList, usePaymentsList } from "@/hooks/useModules";
import { useSettlements } from "@/hooks/useSettlements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

// ── Shared building blocks ──────────────────────────────────────────────────
// The Lovable dashboards share one anatomy across roles: a header (icon + title +
// subtitle + action buttons), a row of four KPI cards with "View all →" links, then
// two rows of two list/widget panels. These primitives keep each role view declarative.

type HeaderAction = { label: string; to: string; primary?: boolean };

function DashHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actions: HeaderAction[];
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-guardian-gold/15 p-2 text-guardian-gold">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Link
            key={a.to + a.label}
            to={a.to}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm",
              a.primary
                ? "border-guardian-navy bg-guardian-navy text-white hover:bg-guardian-navy/90"
                : "bg-background hover:bg-muted",
            )}
          >
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  to,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  to?: string;
  tone?: "danger";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              tone === "danger" ? "text-destructive" : "text-muted-foreground",
            )}
          />
        </div>
        <div className={cn("mt-2 text-2xl font-semibold", tone === "danger" && "text-destructive")}>
          {value}
        </div>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        {to && (
          <Link
            to={to}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-guardian-gold hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function Panel({
  title,
  subtitle,
  viewAllTo,
  viewAllLabel = "View All",
  isEmpty,
  emptyText = "Nothing here yet.",
  children,
}: {
  title: string;
  subtitle?: string;
  viewAllTo?: string;
  viewAllLabel?: string;
  isEmpty?: boolean;
  emptyText?: string;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="shrink-0 text-xs font-medium text-guardian-gold hover:underline"
          >
            {viewAllLabel}
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="divide-y">{children}</ul>
        )}
      </CardContent>
    </Card>
  );
}

function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "danger" | "warn" | "gold" | "muted";
}) {
  const cls = {
    danger: "bg-destructive/10 text-destructive",
    warn: "bg-amber-100 text-amber-700",
    gold: "bg-guardian-gold/15 text-guardian-gold",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium", cls)}>
      {children}
    </span>
  );
}

function Row({
  to,
  primary,
  secondary,
  right,
}: {
  to?: string;
  primary: ReactNode;
  secondary?: ReactNode;
  right?: ReactNode;
}) {
  const body = (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{primary}</p>
        {secondary && <p className="truncate text-xs text-muted-foreground">{secondary}</p>}
      </div>
      {right && <div className="shrink-0 text-right text-xs text-muted-foreground">{right}</div>}
    </div>
  );
  return (
    <li>
      {to ? (
        <Link to={to} className="-mx-2 block rounded px-2 hover:bg-muted/40">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────
const CLOSED_MATTER = new Set(["settled", "dismissed", "declined", "dropped"]);
const PENDING_SETTLEMENT = new Set(["offered", "pending", "sent", "countered", "negotiating"]);
const DAY = 86_400_000;

const priorityTone = (p: string): "danger" | "warn" | "muted" => {
  const v = (p ?? "").toLowerCase();
  if (v === "urgent" || v === "high") return "danger";
  if (v === "medium") return "warn";
  return "muted";
};

const HEADERS: Record<
  string,
  { icon: LucideIcon; title: string; subtitle: string; actions: HeaderAction[] }
> = {
  negotiator: {
    icon: Handshake,
    title: "Negotiator Dashboard",
    subtitle: "Settlement workflow and liability management",
    actions: [{ label: "All Liabilities", to: "/liabilities" }],
  },
  attorney: {
    icon: Gavel,
    title: "Attorney Dashboard",
    subtitle: "Your caseload and upcoming deadlines",
    actions: [
      { label: "Court Calendar", to: "/court-calendar" },
      { label: "All Matters", to: "/litigation" },
    ],
  },
  sales_rep: {
    icon: TrendingUp,
    title: "Sales Dashboard",
    subtitle: "Your lead pipeline and conversions",
    actions: [
      { label: "All Leads", to: "/leads" },
      { label: "New Lead", to: "/leads", primary: true },
    ],
  },
  payment_processor: {
    icon: DollarSign,
    title: "Payments Dashboard",
    subtitle: "Scheduled payments and transaction activity",
    actions: [
      { label: "Payments", to: "/payments" },
      { label: "Transactions", to: "/transactions" },
    ],
  },
  correspondent: {
    icon: FileText,
    title: "Correspondence Dashboard",
    subtitle: "Templates and signature requests",
    actions: [
      { label: "Templates", to: "/templates" },
      { label: "Signatures", to: "/signatures" },
    ],
  },
  case_manager: {
    icon: Briefcase,
    title: "Client Services Dashboard",
    subtitle: "Your clients and active engagements",
    actions: [
      { label: "Clients", to: "/clients" },
      { label: "Tasks", to: "/tasks" },
    ],
  },
  admin: {
    icon: LayoutDashboard,
    title: "Admin Dashboard",
    subtitle: "Company-wide metrics and oversight",
    actions: [
      { label: "Manage Staff", to: "/staff" },
      { label: "New Lead", to: "/leads", primary: true },
    ],
  },
};
// Roles that reuse another role's header/body.
const HEADER_ALIASES: Record<string, string> = {
  paralegal: "attorney",
  of_counsel: "attorney",
  client_services_rep: "case_manager",
  viewer: "admin",
};

export default function Dashboard() {
  const { staff, roles, impersonatedView } = useAuth();
  const role = roles[0] ?? "viewer";
  const headerRole = HEADERS[role] ? role : (HEADER_ALIASES[role] ?? "admin");
  const header = HEADERS[headerRole];
  const myId = staff?.id;

  const clients = useClients();
  const leads = useLeads();
  const liabilities = useLiabilities();
  const services = useClientServices();
  const matters = useLitigationMatters();
  const tasks = useTasksList();
  const staffList = useStaffList();
  const payments = usePaymentsList();

  const liabIds = useMemo(() => (liabilities.data ?? []).map((l) => l.id), [liabilities.data]);
  const settlements = useSettlements(liabIds);

  const d = useMemo(() => {
    const now = Date.now();
    const in14 = now + 14 * DAY;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthMs = monthStart.getTime();

    const leadRows = leads.data ?? [];
    const liabRows = liabilities.data ?? [];
    const matterRows = matters.data ?? [];
    const taskRows = tasks.data ?? [];
    const svcRows = services.data ?? [];
    const setlRows = settlements.data ?? [];

    const openTasks = taskRows.filter((t) => t.status !== "completed" && t.status !== "cancelled");
    const myOpenTasks = openTasks.filter((t) => myId && t.assigned_to === myId);
    const overdue = (due: string | null) => !!due && new Date(due).getTime() < now;

    // Liabilities ready for negotiation: enrolled with no active settlement on record.
    const liabsWithSettlement = new Set(setlRows.map((s) => s.liability_id));

    // Service status summary (admin).
    const svcCounts = new Map<string, number>();
    for (const s of svcRows) svcCounts.set(s.status, (svcCounts.get(s.status) ?? 0) + 1);

    // Staff workload: open tasks assigned per active team member (admin).
    const workload = (staffList.data ?? [])
      .filter((s) => s.is_active)
      .map((s) => ({
        ...s,
        count: openTasks.filter((t) => t.assigned_to === s.id).length,
      }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      now,
      // KPI scalars
      clients: clients.data?.length ?? 0,
      openLeads: leadRows.filter((l) => l.status !== "converted" && l.status !== "lost").length,
      newLeads: leadRows.filter((l) => l.status === "new").length,
      converted: leadRows.filter((l) => l.status === "converted").length,
      pipelineDebt: leadRows.reduce((s, l) => s + (l.estimated_debt_amount ?? 0), 0),
      enrolledBalance: liabRows.reduce((s, l) => s + (l.enrolled_balance ?? 0), 0),
      inNegotiation: liabRows.filter((l) => l.status === "in_negotiation").length,
      activeServices: svcRows.filter((s) => s.status === "active").length,
      pendingServices: svcRows.filter((s) => s.status === "pending").length,
      openTasksCount: openTasks.length,
      myOpenTasksCount: myOpenTasks.length,
      paymentsPending: (payments.data ?? []).filter(
        (p) => p.status === "pending" || p.status === "open",
      ).length,
      paymentsCleared: (payments.data ?? []).filter((p) => p.status === "cleared").length,
      activeCases: matterRows.filter((r) => !CLOSED_MATTER.has(r.status)).length,
      preResponse: matterRows.filter((r) => r.status === "pre_response").length,
      deadlines14: matterRows.filter(
        (r) =>
          r.response_deadline &&
          !CLOSED_MATTER.has(r.status) &&
          new Date(r.response_deadline).getTime() <= in14,
      ).length,
      pendingSettlements: setlRows.filter((s) => PENDING_SETTLEMENT.has(s.status)).length,
      awaitingApproval: setlRows.filter((s) => s.status === "accepted" && !s.attorney_approved)
        .length,
      settlementValueMonth: setlRows
        .filter((s) => s.completed_date && new Date(s.completed_date).getTime() >= monthMs)
        .reduce((acc, s) => acc + (s.offer_amount ?? 0), 0),

      // Lists
      inNegotiationList: liabRows.filter((l) => l.status === "in_negotiation").slice(0, 6),
      readyForNegotiation: liabRows
        .filter((l) => l.status === "enrolled" && !liabsWithSettlement.has(l.id))
        .slice(0, 6),
      pendingSettlementList: setlRows.filter((s) => PENDING_SETTLEMENT.has(s.status)).slice(0, 6),
      recentSettlements: [...setlRows]
        .sort((a, b) => (b.offered_date ?? "").localeCompare(a.offered_date ?? ""))
        .slice(0, 6),
      upcomingDeadlines: matterRows
        .filter((r) => r.response_deadline && !CLOSED_MATTER.has(r.status))
        .sort((a, b) => (a.response_deadline ?? "").localeCompare(b.response_deadline ?? ""))
        .slice(0, 6),
      casesRequiringAction: matterRows
        .filter(
          (r) =>
            r.status === "pre_response" ||
            (overdue(r.response_deadline) && !CLOSED_MATTER.has(r.status)),
        )
        .slice(0, 6),
      myTasks: myOpenTasks
        .slice()
        .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
        .slice(0, 6),
      recentLeads: [...leadRows]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 6),
      recentMatters: [...matterRows]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 6),
      recentTasks: taskRows.slice(0, 6),
      needsFollowUp: leadRows.filter((l) => l.status === "new").slice(0, 6),
      pipeline: (["new", "contacted", "qualified", "converted"] as const).map((st) => ({
        status: st,
        count: leadRows.filter((l) => l.status === st).length,
      })),
      serviceSummary: [...svcCounts.entries()].map(([status, count]) => ({ status, count })),
      workload,
    };
  }, [
    clients.data,
    leads.data,
    liabilities.data,
    matters.data,
    tasks.data,
    services.data,
    settlements.data,
    staffList.data,
    payments.data,
    myId,
  ]);

  const dueRight = (due: string | null) => {
    if (!due) return null;
    const od = new Date(due).getTime() < d.now;
    return (
      <span className={od ? "font-medium text-destructive" : undefined}>
        {od ? "Overdue · " : ""}
        {formatDate(due)}
      </span>
    );
  };

  // ── Per-role body ───────────────────────────────────────────────────────────
  let body: ReactNode;
  switch (headerRole) {
    case "negotiator":
      body = (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Handshake}
              label="In Negotiation"
              value={d.inNegotiation}
              sub="Active negotiations"
              to="/liabilities"
            />
            <KpiCard
              icon={ClipboardList}
              label="Pending Settlements"
              value={d.pendingSettlements}
              sub="Offers awaiting response"
              to="/liabilities"
            />
            <KpiCard
              icon={AlertTriangle}
              label="Awaiting Approval"
              value={d.awaitingApproval}
              sub="Need attorney sign-off"
            />
            <KpiCard
              icon={DollarSign}
              label="Settlement Value"
              value={formatCurrency(d.settlementValueMonth)}
              sub="This month"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="In Negotiation"
              subtitle="Active negotiations"
              viewAllTo="/liabilities"
              isEmpty={d.inNegotiationList.length === 0}
              emptyText="No active negotiations."
            >
              {d.inNegotiationList.map((l) => (
                <Row
                  key={l.id}
                  to={`/liabilities/${l.id}`}
                  primary={titleCase(l.liability_type)}
                  secondary={`Balance ${formatCurrency(l.current_balance ?? 0)}`}
                  right={<Badge tone="gold">In Negotiation</Badge>}
                />
              ))}
            </Panel>
            <Panel
              title="Ready for Negotiation"
              subtitle="Enrolled without active offers"
              viewAllTo="/liabilities"
              isEmpty={d.readyForNegotiation.length === 0}
              emptyText="Nothing ready right now."
            >
              {d.readyForNegotiation.map((l) => (
                <Row
                  key={l.id}
                  to={`/liabilities/${l.id}`}
                  primary={titleCase(l.liability_type)}
                  secondary={`Enrolled ${formatCurrency(l.enrolled_balance ?? 0)}`}
                  right={<Badge>Ready</Badge>}
                />
              ))}
            </Panel>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Pending Settlements"
              subtitle="Offers awaiting response"
              viewAllTo="/liabilities"
              isEmpty={d.pendingSettlementList.length === 0}
              emptyText="No pending offers."
            >
              {d.pendingSettlementList.map((s) => (
                <Row
                  key={s.id}
                  to={`/liabilities/${s.liability_id}`}
                  primary={formatCurrency(s.offer_amount)}
                  secondary={
                    s.offer_percentage
                      ? `${s.offer_percentage}% of balance`
                      : titleCase(s.payment_type)
                  }
                  right={<Badge tone="warn">{titleCase(s.status)}</Badge>}
                />
              ))}
            </Panel>
            <Panel
              title="Recent Settlement Activity"
              subtitle="Latest offers and outcomes"
              isEmpty={d.recentSettlements.length === 0}
              emptyText="No settlement activity yet."
            >
              {d.recentSettlements.map((s) => (
                <Row
                  key={s.id}
                  to={`/liabilities/${s.liability_id}`}
                  primary={`${formatCurrency(s.offer_amount)} · ${titleCase(s.status)}`}
                  secondary={s.offered_date ? formatDate(s.offered_date) : "—"}
                />
              ))}
            </Panel>
          </div>
        </>
      );
      break;

    case "attorney":
      body = (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Gavel}
              label="Active Cases"
              value={d.activeCases}
              sub={`${d.preResponse} pre-response`}
              to="/litigation"
            />
            <KpiCard
              icon={AlertTriangle}
              label="Pre-Response"
              value={d.preResponse}
              sub="Require immediate attention"
              tone="danger"
            />
            <KpiCard
              icon={CalendarClock}
              label="Deadlines (14 days)"
              value={d.deadlines14}
              sub="Court dates & responses"
              to="/court-calendar"
            />
            <KpiCard
              icon={CheckSquare}
              label="Pending Tasks"
              value={d.myOpenTasksCount}
              sub="Assigned to you"
              to="/tasks"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Upcoming Deadlines"
              subtitle="Next 14 days"
              viewAllTo="/court-calendar"
              isEmpty={d.upcomingDeadlines.length === 0}
              emptyText="No open deadlines."
            >
              {d.upcomingDeadlines.map((r) => (
                <Row
                  key={r.id}
                  to={`/litigation/${r.id}`}
                  primary={r.case_number || r.opposing_party || "Matter"}
                  secondary={
                    [r.court_name, r.state].filter(Boolean).join(" · ") || titleCase(r.status)
                  }
                  right={dueRight(r.response_deadline)}
                />
              ))}
            </Panel>
            <Panel
              title="Cases Requiring Action"
              subtitle="Matters needing your attention"
              viewAllTo="/litigation"
              isEmpty={d.casesRequiringAction.length === 0}
              emptyText="Nothing needs action."
            >
              {d.casesRequiringAction.map((r) => (
                <Row
                  key={r.id}
                  to={`/litigation/${r.id}`}
                  primary={r.case_number || r.opposing_party || "Matter"}
                  secondary={r.court_name || r.state || ""}
                  right={<Badge tone="danger">{titleCase(r.status)}</Badge>}
                />
              ))}
            </Panel>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="My Tasks"
              subtitle="Tasks assigned to you"
              viewAllTo="/tasks"
              isEmpty={d.myTasks.length === 0}
              emptyText="No open tasks."
            >
              {d.myTasks.map((t) => (
                <Row
                  key={t.id}
                  primary={t.title}
                  secondary={<Badge tone={priorityTone(t.priority)}>{titleCase(t.priority)}</Badge>}
                  right={dueRight(t.due_date)}
                />
              ))}
            </Panel>
            <Panel
              title="Recent Case Activity"
              subtitle="Newly opened matters"
              viewAllTo="/litigation"
              isEmpty={d.recentMatters.length === 0}
              emptyText="No recent matters."
            >
              {d.recentMatters.map((r) => (
                <Row
                  key={r.id}
                  to={`/litigation/${r.id}`}
                  primary={r.case_number || r.opposing_party || "Matter"}
                  secondary={titleCase(r.status)}
                  right={formatDate(r.created_at)}
                />
              ))}
            </Panel>
          </div>
        </>
      );
      break;

    case "sales_rep": {
      const maxStage = Math.max(1, ...d.pipeline.map((p) => p.count));
      body = (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Users}
              label="My Active Leads"
              value={d.openLeads}
              sub="In your pipeline"
              to="/leads"
            />
            <KpiCard
              icon={UserPlus}
              label="New Leads"
              value={d.newLeads}
              sub="Awaiting first contact"
              to="/leads"
            />
            <KpiCard
              icon={TrendingUp}
              label="Conversions"
              value={d.converted}
              sub="Leads won"
              to="/leads"
            />
            <KpiCard
              icon={CheckSquare}
              label="Follow-up Tasks"
              value={d.myOpenTasksCount}
              sub="Pending"
              to="/tasks"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lead Pipeline</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">Your leads by stage</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {d.pipeline.map((p) => (
                  <div key={p.status}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{titleCase(p.status)}</span>
                      <span className="font-medium">{p.count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-guardian-gold"
                        style={{ width: `${(p.count / maxStage) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Panel
              title="Needs Follow-up"
              subtitle="Leads awaiting contact"
              viewAllTo="/leads"
              isEmpty={d.needsFollowUp.length === 0}
              emptyText="All caught up."
            >
              {d.needsFollowUp.map((l) => (
                <Row
                  key={l.id}
                  to={`/leads/${l.id}`}
                  primary={`${l.first_name} ${l.last_name}`}
                  secondary={l.phone || l.email || titleCase(l.source)}
                  right={<Badge tone="warn">New</Badge>}
                />
              ))}
            </Panel>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="My Tasks"
              subtitle="Tasks assigned to you"
              viewAllTo="/tasks"
              isEmpty={d.myTasks.length === 0}
              emptyText="No open tasks."
            >
              {d.myTasks.map((t) => (
                <Row
                  key={t.id}
                  primary={t.title}
                  secondary={<Badge tone={priorityTone(t.priority)}>{titleCase(t.priority)}</Badge>}
                  right={dueRight(t.due_date)}
                />
              ))}
            </Panel>
            <Panel
              title="Recent Lead Activity"
              subtitle="Latest leads"
              viewAllTo="/leads"
              isEmpty={d.recentLeads.length === 0}
              emptyText="No recent leads."
            >
              {d.recentLeads.map((l) => (
                <Row
                  key={l.id}
                  to={`/leads/${l.id}`}
                  primary={`${l.first_name} ${l.last_name}`}
                  secondary={titleCase(l.status)}
                  right={formatDate(l.created_at)}
                />
              ))}
            </Panel>
          </div>
        </>
      );
      break;
    }

    case "payment_processor":
      body = (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={ClipboardList}
              label="Payments Pending"
              value={d.paymentsPending}
              sub="Scheduled / open"
              to="/payments"
            />
            <KpiCard
              icon={CheckSquare}
              label="Cleared"
              value={d.paymentsCleared}
              sub="Processed"
              to="/transactions"
            />
            <KpiCard
              icon={DollarSign}
              label="Enrolled Balance"
              value={formatCurrency(d.enrolledBalance)}
              sub="Across liabilities"
            />
            <KpiCard
              icon={Users}
              label="Active Clients"
              value={d.clients}
              sub="Total in system"
              to="/clients"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="My Tasks"
              subtitle="Tasks assigned to you"
              viewAllTo="/tasks"
              isEmpty={d.myTasks.length === 0}
              emptyText="No open tasks."
            >
              {d.myTasks.map((t) => (
                <Row
                  key={t.id}
                  primary={t.title}
                  secondary={<Badge tone={priorityTone(t.priority)}>{titleCase(t.priority)}</Badge>}
                  right={dueRight(t.due_date)}
                />
              ))}
            </Panel>
            <Panel
              title="Recent Activity"
              subtitle="Latest task updates"
              viewAllTo="/tasks"
              isEmpty={d.recentTasks.length === 0}
              emptyText="No recent activity."
            >
              {d.recentTasks.map((t) => (
                <Row
                  key={t.id}
                  primary={t.title}
                  secondary={titleCase(t.status)}
                  right={<Badge tone={priorityTone(t.priority)}>{titleCase(t.priority)}</Badge>}
                />
              ))}
            </Panel>
          </div>
        </>
      );
      break;

    case "correspondent":
    case "case_manager":
      body = (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Users}
              label="Clients"
              value={d.clients}
              sub="Total in system"
              to="/clients"
            />
            <KpiCard
              icon={Briefcase}
              label="Active Services"
              value={d.activeServices}
              sub={`${d.activeServices} active, ${d.pendingServices} pending`}
              to="/engagements"
            />
            <KpiCard
              icon={Handshake}
              label="In Negotiation"
              value={d.inNegotiation}
              sub="Liabilities being negotiated"
              to="/liabilities"
            />
            <KpiCard
              icon={CheckSquare}
              label="Pending Tasks"
              value={d.myOpenTasksCount}
              sub="Assigned to you"
              to="/tasks"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="My Tasks"
              subtitle="Tasks assigned to you"
              viewAllTo="/tasks"
              isEmpty={d.myTasks.length === 0}
              emptyText="No open tasks."
            >
              {d.myTasks.map((t) => (
                <Row
                  key={t.id}
                  primary={t.title}
                  secondary={<Badge tone={priorityTone(t.priority)}>{titleCase(t.priority)}</Badge>}
                  right={dueRight(t.due_date)}
                />
              ))}
            </Panel>
            <Panel
              title="Service Status Summary"
              subtitle="Active services by status"
              viewAllTo="/engagements"
              isEmpty={d.serviceSummary.length === 0}
              emptyText="No services yet."
            >
              {d.serviceSummary.map((s) => (
                <Row
                  key={s.status}
                  primary={titleCase(s.status)}
                  right={<Badge>{s.count}</Badge>}
                />
              ))}
            </Panel>
          </div>
        </>
      );
      break;

    default: // admin, viewer
      body = (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Users}
              label="Active Clients"
              value={d.clients}
              sub="Total in system"
              to="/clients"
            />
            <KpiCard
              icon={Briefcase}
              label="Active Services"
              value={d.activeServices}
              sub={`${d.activeServices} active, ${d.pendingServices} pending`}
              to="/engagements"
            />
            <KpiCard
              icon={Handshake}
              label="In Negotiation"
              value={d.inNegotiation}
              sub="Liabilities being negotiated"
              to="/liabilities"
            />
            <KpiCard
              icon={CheckSquare}
              label="Pending Tasks"
              value={d.openTasksCount}
              sub="Company-wide"
              to="/tasks"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Staff Workload"
              subtitle="Open tasks per team member"
              viewAllTo="/staff"
              viewAllLabel="View All Staff"
              isEmpty={d.workload.length === 0}
              emptyText="No assigned tasks."
            >
              {d.workload.map((s) => (
                <Row
                  key={s.id}
                  primary={`${s.first_name} ${s.last_name}`}
                  secondary={titleCase(s.department)}
                  right={<Badge>{s.count} tasks</Badge>}
                />
              ))}
            </Panel>
            <Panel
              title="Upcoming Deadlines"
              subtitle="Company-wide court dates"
              viewAllTo="/court-calendar"
              isEmpty={d.upcomingDeadlines.length === 0}
              emptyText="No open deadlines."
            >
              {d.upcomingDeadlines.map((r) => (
                <Row
                  key={r.id}
                  to={`/litigation/${r.id}`}
                  primary={r.case_number || r.opposing_party || "Matter"}
                  secondary={titleCase(r.status)}
                  right={dueRight(r.response_deadline)}
                />
              ))}
            </Panel>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Service Status Summary"
              subtitle="Active services by status"
              viewAllTo="/engagements"
              isEmpty={d.serviceSummary.length === 0}
              emptyText="No services yet."
            >
              {d.serviceSummary.map((s) => (
                <Row
                  key={s.status}
                  primary={titleCase(s.status)}
                  right={<Badge>{s.count}</Badge>}
                />
              ))}
            </Panel>
            <Panel
              title="Recent Activity"
              subtitle="Latest task updates"
              viewAllTo="/tasks"
              isEmpty={d.recentTasks.length === 0}
              emptyText="No recent activity."
            >
              {d.recentTasks.map((t) => (
                <Row
                  key={t.id}
                  primary={t.title}
                  secondary={titleCase(t.status)}
                  right={<Badge tone={priorityTone(t.priority)}>{titleCase(t.priority)}</Badge>}
                />
              ))}
            </Panel>
          </div>
        </>
      );
  }

  return (
    <div className="space-y-6">
      <DashHeader
        icon={header.icon}
        title={header.title}
        subtitle={header.subtitle}
        actions={header.actions}
      />

      {impersonatedView && (
        <div className="flex items-center gap-2 rounded-md border border-guardian-gold/40 bg-guardian-gold/10 px-3 py-2 text-sm">
          <Activity className="h-4 w-4 text-guardian-gold" />
          <span>
            Previewing as <span className="font-medium">{titleCase(role)}</span>. Switch or clear
            with the “Viewing as” menu in the top bar.
          </span>
        </div>
      )}

      {body}
    </div>
  );
}
