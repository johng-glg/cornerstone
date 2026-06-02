import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEngagement, useClientLiabilities } from "@/hooks/useClientDetail";
import { useClientPayments, useClientLitigation } from "@/hooks/useClientDetail";
import { QueryState } from "@/components/common/QueryState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/common/StatCard";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function EngagementDetail() {
  const { id } = useParams<{ id: string }>();
  const eng = useEngagement(id);
  const serviceIds = useMemo(() => (id ? [id] : []), [id]);
  const liabilities = useClientLiabilities(id, serviceIds);
  const payments = useClientPayments(id, serviceIds);
  const litigation = useClientLitigation(id, serviceIds);

  const planLabel = eng.data?.plan_type
    ? titleCase(eng.data.plan_type.replace("glg_", "GLG "))
    : "—";

  return (
    <div className="space-y-5">
      <Link
        to="/engagements"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to engagements
      </Link>

      <QueryState
        isLoading={eng.isLoading}
        error={eng.error}
        isEmpty={!eng.data}
        emptyMessage="Engagement not found."
      >
        {eng.data && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-mono text-2xl font-semibold">{eng.data.service_number}</h1>
                  <StatusBadge status={eng.data.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {planLabel} · {eng.data.term_months ?? "—"} mo · {eng.data.program_type ?? "—"}
                </p>
              </div>
              {eng.data.primary_client_id && (
                <Link
                  to={`/clients/${eng.data.primary_client_id}`}
                  className="text-sm text-guardian-gold hover:underline"
                >
                  View client
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Monthly draft" value={formatCurrency(eng.data.monthly_payment)} />
              <StatCard
                label="Enrolled debt"
                value={formatCurrency(eng.data.total_enrolled_debt)}
              />
              <StatCard label="Escrow balance" value={formatCurrency(eng.data.escrow_balance)} />
              <StatCard
                label="Settlement fee"
                value={
                  eng.data.settlement_fee_percentage
                    ? `${eng.data.settlement_fee_percentage}%`
                    : "—"
                }
              />
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="flex-wrap">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="litigation">Litigation</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Program terms</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-x-6 sm:grid-cols-2">
                    <Row label="Plan type" value={planLabel} />
                    <Row
                      label="Term"
                      value={eng.data.term_months ? `${eng.data.term_months} months` : "—"}
                    />
                    <Row label="Monthly draft" value={formatCurrency(eng.data.monthly_payment)} />
                    <Row
                      label="Frequency"
                      value={
                        eng.data.payment_frequency ? titleCase(eng.data.payment_frequency) : "—"
                      }
                    />
                    <Row label="Enrolled" value={formatDate(eng.data.enrolled_date)} />
                    <Row label="First payment" value={formatDate(eng.data.first_payment_date)} />
                    <Row
                      label="Enrolled debt"
                      value={formatCurrency(eng.data.total_enrolled_debt)}
                    />
                    <Row label="Escrow" value={formatCurrency(eng.data.escrow_balance)} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="liabilities">
                <QueryState
                  isLoading={liabilities.isLoading}
                  error={liabilities.error}
                  isEmpty={(liabilities.data ?? []).length === 0}
                  emptyMessage="No liabilities."
                >
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/50 text-left">
                        <tr>
                          <th className="px-3 py-2 font-medium">Creditor / Acct</th>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">Current</th>
                          <th className="px-3 py-2 font-medium">Enrolled</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(liabilities.data ?? []).map((l) => (
                          <tr key={l.id} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              {l.notes ?? (l.account_number ? `••••${l.account_number}` : "—")}
                            </td>
                            <td className="px-3 py-2">{titleCase(l.liability_type)}</td>
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
              </TabsContent>

              <TabsContent value="payments">
                <QueryState
                  isLoading={payments.isLoading}
                  error={payments.error}
                  isEmpty={(payments.data ?? []).length === 0}
                  emptyMessage="No payments."
                >
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/50 text-left">
                        <tr>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">Amount</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Scheduled</th>
                          <th className="px-3 py-2 font-medium">Processed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(payments.data ?? []).map((t) => (
                          <tr key={t.id} className="border-b last:border-0">
                            <td className="px-3 py-2">{titleCase(t.transaction_type)}</td>
                            <td className="px-3 py-2">{formatCurrency(t.amount)}</td>
                            <td className="px-3 py-2">
                              <StatusBadge status={t.status} />
                            </td>
                            <td className="px-3 py-2">{formatDate(t.scheduled_date)}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {formatDate(t.processed_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </QueryState>
              </TabsContent>

              <TabsContent value="litigation">
                <QueryState
                  isLoading={litigation.isLoading}
                  error={litigation.error}
                  isEmpty={(litigation.data ?? []).length === 0}
                  emptyMessage="No litigation matters."
                >
                  <div className="space-y-2">
                    {(litigation.data ?? []).map((m) => (
                      <Link key={m.id} to={`/litigation/${m.id}`}>
                        <Card className="transition-colors hover:bg-muted/40">
                          <CardContent className="flex items-center justify-between py-3">
                            <span className="text-sm">
                              <span className="font-mono">{m.case_number ?? "—"}</span>{" "}
                              <span className="text-muted-foreground">
                                · {m.court_name ?? "—"} · {m.opposing_party ?? "—"}
                              </span>
                            </span>
                            <StatusBadge status={m.status} />
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </QueryState>
              </TabsContent>
            </Tabs>
          </>
        )}
      </QueryState>
    </div>
  );
}
