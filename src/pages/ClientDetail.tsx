import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from "lucide-react";
import {
  useClient,
  useClientServices,
  useClientLiabilities,
  useClientPhones,
  useClientAddresses,
} from "@/hooks/useClientDetail";
import { QueryState } from "@/components/common/QueryState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ClientActivityFeed } from "@/components/common/ActivityFeed";
import { NotesTab } from "@/components/leads/tabs/NotesTab";
import { TasksTab } from "@/components/leads/tabs/TasksTab";
import { ClientEditDialog } from "@/components/clients/ClientEditDialog";
import {
  ClientLitigationTab,
  ClientPaymentsTab,
  ClientBillingTab,
  ClientDocumentsTab,
  ClientSignaturesTab,
  ClientCommsTab,
} from "@/components/clients/detail/ClientListTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatCard({
  value,
  sub,
  icon: Icon,
}: {
  value: React.ReactNode;
  sub: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md bg-muted p-2 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = useClient(id);
  const services = useClientServices(id);
  const phones = useClientPhones(id);
  const addresses = useClientAddresses(id);
  const serviceIds = useMemo(() => (services.data ?? []).map((s) => s.id), [services.data]);
  const liabilities = useClientLiabilities(id, serviceIds);
  const [editing, setEditing] = useState(false);

  const engagements = services.data ?? [];
  const liabs = liabilities.data ?? [];
  const enrolledTotal = liabs.reduce(
    (s, l) => s + (l.enrolled_balance ?? l.current_balance ?? 0),
    0,
  );
  const activeEngagements = engagements.filter((s) => s.status === "active").length;
  const settledTotal = liabs
    .filter((l) => l.status === "settled")
    .reduce((s, l) => s + (l.enrolled_balance ?? l.current_balance ?? 0), 0);
  const pctSettled = enrolledTotal > 0 ? Math.round((settledTotal / enrolledTotal) * 100) : 0;
  const inNegotiation = liabs.filter((l) => l.status === "in_negotiation").length;

  return (
    <div className="space-y-5">
      <Link
        to="/clients"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Link>

      <QueryState
        isLoading={client.isLoading}
        error={client.error}
        isEmpty={!client.data}
        emptyMessage="Client not found."
      >
        {client.data && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold">
                    {client.data.first_name} {client.data.last_name}
                  </h1>
                  <StatusBadge
                    status={client.data.status ?? (client.data.is_active ? "active" : "inactive")}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {client.data.email ?? "no email"}
                  {client.data.ssn_last4 ? ` · SSN ••••${client.data.ssn_last4}` : ""}
                  {client.data.forth_crm_id ? ` · Forth ${client.data.forth_crm_id}` : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
              </Button>
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="engagements">Engagements</TabsTrigger>
                <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
                <TabsTrigger value="litigation">Litigation</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="signatures">Signatures</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="comms">Comms</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              {/* OVERVIEW */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard
                    icon={Briefcase}
                    value={engagements.length}
                    sub={`${activeEngagements} active`}
                  />
                  <StatCard
                    icon={TrendingUp}
                    value={formatCurrency(enrolledTotal)}
                    sub="Total enrolled"
                  />
                  <StatCard
                    icon={CheckCircle2}
                    value={formatCurrency(settledTotal)}
                    sub={`${pctSettled}% settled`}
                  />
                  <StatCard
                    icon={Clock}
                    value={liabs.length}
                    sub={`${inNegotiation} in negotiation`}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Identity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Row
                        label="Name"
                        value={`${client.data.first_name} ${client.data.middle_name ?? ""} ${client.data.last_name}`.replace(
                          /\s+/g,
                          " ",
                        )}
                      />
                      <Row label="Date of Birth" value={formatDate(client.data.date_of_birth)} />
                      <Row
                        label="SSN (last 4)"
                        value={client.data.ssn_last4 ? `••••${client.data.ssn_last4}` : "—"}
                      />
                      <Row label="TCPA Consent" value={client.data.tcpa_consent ? "Yes" : "No"} />
                      <Row label="Client since" value={formatDate(client.data.created_at)} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="text-guardian-gold">{client.data.email ?? "—"}</p>
                      {(phones.data ?? []).length === 0 && (
                        <p className="text-muted-foreground">No phone numbers</p>
                      )}
                      {(phones.data ?? []).map((p) => (
                        <p key={p.id}>
                          {p.phone_number}{" "}
                          <span className="text-muted-foreground">({titleCase(p.phone_type)})</span>
                        </p>
                      ))}
                      {(addresses.data ?? []).map((a) => (
                        <p key={a.id} className="text-muted-foreground">
                          {a.city}, {a.state} {a.zip_code} ({titleCase(a.address_type)})
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                </div>
                {client.data.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Profile note</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm">{client.data.notes}</p>
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Client Notes</CardTitle>
                  </CardHeader>
                  <CardContent>{id && <NotesTab entityId={id} entityType="client" />}</CardContent>
                </Card>
              </TabsContent>

              {/* ENGAGEMENTS */}
              <TabsContent value="engagements">
                <QueryState
                  isLoading={services.isLoading}
                  error={services.error}
                  isEmpty={(services.data ?? []).length === 0}
                  emptyMessage="No engagements yet."
                >
                  <div className="space-y-3">
                    {(services.data ?? []).map((s) => (
                      <Card key={s.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm">{s.service_number}</span>
                            <StatusBadge status={s.status} />
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-x-4 sm:grid-cols-4">
                            <Row
                              label="Plan"
                              value={
                                s.plan_type ? titleCase(s.plan_type.replace("glg_", "GLG ")) : "—"
                              }
                            />
                            <Row label="Term" value={s.term_months ? `${s.term_months} mo` : "—"} />
                            <Row label="Monthly" value={formatCurrency(s.monthly_payment)} />
                            <Row
                              label="Enrolled debt"
                              value={formatCurrency(s.total_enrolled_debt)}
                            />
                            <Row label="Escrow" value={formatCurrency(s.escrow_balance)} />
                            <Row
                              label="Fee"
                              value={
                                s.settlement_fee_percentage
                                  ? `${s.settlement_fee_percentage}%`
                                  : "—"
                              }
                            />
                            <Row label="Enrolled" value={formatDate(s.enrolled_date)} />
                            <Row label="1st payment" value={formatDate(s.first_payment_date)} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </QueryState>
              </TabsContent>

              {/* LIABILITIES */}
              <TabsContent value="liabilities">
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base">Liabilities</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      Enrolled {formatCurrency(enrolledTotal)}
                    </span>
                  </CardHeader>
                  <CardContent>
                    <QueryState
                      isLoading={services.isLoading || liabilities.isLoading}
                      error={liabilities.error}
                      isEmpty={(liabilities.data ?? []).length === 0}
                      emptyMessage="No liabilities on this client's engagements."
                    >
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                          <thead className="border-b bg-muted/50 text-left">
                            <tr>
                              <th className="px-3 py-2 font-medium">Creditor / Acct</th>
                              <th className="px-3 py-2 font-medium">Type</th>
                              <th className="px-3 py-2 font-medium">Original</th>
                              <th className="px-3 py-2 font-medium">Current</th>
                              <th className="px-3 py-2 font-medium">Enrolled</th>
                              <th className="px-3 py-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(liabilities.data ?? []).map((l) => (
                              <tr
                                key={l.id}
                                onClick={() => navigate(`/liabilities/${l.id}`)}
                                className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                              >
                                <td className="px-3 py-2">
                                  {l.current_creditor?.name
                                    ? `${l.current_creditor.name}${
                                        l.account_number ? ` ••••${l.account_number}` : ""
                                      }`
                                    : l.account_number
                                      ? `••••${l.account_number}`
                                      : "—"}
                                </td>
                                <td className="px-3 py-2">{titleCase(l.liability_type)}</td>
                                <td className="px-3 py-2">{formatCurrency(l.original_balance)}</td>
                                <td className="px-3 py-2">{formatCurrency(l.current_balance)}</td>
                                <td className="px-3 py-2">{formatCurrency(l.enrolled_balance)}</td>
                                <td className="px-3 py-2">
                                  <StatusBadge status={l.status} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </QueryState>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="litigation">
                {id && <ClientLitigationTab clientId={id} serviceIds={serviceIds} />}
              </TabsContent>
              <TabsContent value="payments">
                {id && <ClientPaymentsTab clientId={id} serviceIds={serviceIds} />}
              </TabsContent>
              <TabsContent value="billing">{id && <ClientBillingTab clientId={id} />}</TabsContent>
              <TabsContent value="documents">
                {id && <ClientDocumentsTab clientId={id} />}
              </TabsContent>
              <TabsContent value="signatures">
                {id && <ClientSignaturesTab clientId={id} />}
              </TabsContent>
              <TabsContent value="notes">
                {id && <NotesTab entityId={id} entityType="client" />}
              </TabsContent>
              <TabsContent value="tasks">
                {id && <TasksTab entityId={id} entityType="client" />}
              </TabsContent>
              <TabsContent value="comms">{id && <ClientCommsTab clientId={id} />}</TabsContent>
              <TabsContent value="activity">
                {id && <ClientActivityFeed clientId={id} />}
              </TabsContent>
            </Tabs>

            <ClientEditDialog client={client.data} open={editing} onOpenChange={setEditing} />
          </>
        )}
      </QueryState>
    </div>
  );
}
