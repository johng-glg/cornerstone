import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useLead, useLeadActivities, useLeadDebts } from "@/hooks/useLeadDetail";
import { useUpdateLead } from "@/hooks/useCoreCrm";
import type { LeadStatus } from "@/lib/db-types";
import { QueryState } from "@/components/common/QueryState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LeadDetailDialog } from "@/components/leads/LeadDetailDialog";
import { LogActivityForm } from "@/components/leads/LogActivityForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

const WORKFLOW: LeadStatus[] = ["new", "contacted", "qualified", "converted"];

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const lead = useLead(id);
  const activities = useLeadActivities(id);
  const debts = useLeadDebts(id);
  const updateLead = useUpdateLead();
  const [editing, setEditing] = useState(false);

  const setStatus = (status: LeadStatus) => {
    if (!id) return;
    updateLead.mutate(
      { id, status },
      {
        onSuccess: () => toast.success(`Marked ${titleCase(status)}.`),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const debtTotal = (debts.data ?? []).reduce((s, d) => s + (d.current_balance ?? 0), 0);

  return (
    <div className="space-y-6">
      <Link
        to="/leads"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <QueryState
        isLoading={lead.isLoading}
        error={lead.error}
        isEmpty={!lead.data}
        emptyMessage="Lead not found."
      >
        {lead.data && (
          <>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold">
                    {lead.data.first_name} {lead.data.last_name}
                  </h1>
                  <StatusBadge status={lead.data.status} />
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {lead.data.lead_number} · Score {lead.data.lead_score ?? "—"} ·{" "}
                  {titleCase(lead.data.source)} · {titleCase(lead.data.interest_type)}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </div>

            {/* Status workflow */}
            <div className="flex flex-wrap items-center gap-2">
              {WORKFLOW.map((s) => {
                const active = lead.data!.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={updateLead.isPending || active}
                    onClick={() => setStatus(s)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-100",
                      active
                        ? "border-guardian-navy bg-guardian-navy text-primary-foreground"
                        : "border-input bg-background hover:border-guardian-gold hover:text-guardian-navy",
                    )}
                  >
                    {titleCase(s)}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={updateLead.isPending || lead.data.status === "lost"}
                onClick={() => setStatus("lost")}
                className="rounded-full border border-input px-3 py-1 text-xs font-medium text-destructive transition-colors hover:border-destructive disabled:opacity-50"
              >
                Mark Lost
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Overview */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="Email" value={lead.data.email ?? "—"} />
                    <Field label="Phone" value={lead.data.phone ?? "—"} />
                    <Field label="State" value={lead.data.state ?? "—"} />
                    <Field
                      label="Est. debt"
                      value={formatCurrency(lead.data.estimated_debt_amount)}
                    />
                    <Field label="# Debts" value={lead.data.number_of_debts ?? "—"} />
                    <Field
                      label="Monthly income"
                      value={formatCurrency(lead.data.monthly_income)}
                    />
                    <Field
                      label="Active lawsuit"
                      value={lead.data.has_active_lawsuit ? "Yes" : "No"}
                    />
                    <Field label="Bankruptcy" value={lead.data.in_bankruptcy ? "Yes" : "No"} />
                    <Field
                      label="Employment"
                      value={
                        lead.data.employment_status ? titleCase(lead.data.employment_status) : "—"
                      }
                    />
                    <Field label="Created" value={formatDate(lead.data.created_at)} />
                  </dl>
                  {lead.data.notes && (
                    <div className="mt-4 border-t pt-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{lead.data.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity timeline */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {id && <LogActivityForm leadId={id} />}
                  <QueryState
                    isLoading={activities.isLoading}
                    error={activities.error}
                    isEmpty={(activities.data ?? []).length === 0}
                    emptyMessage="No activity logged yet."
                  >
                    <ol className="space-y-3">
                      {(activities.data ?? []).map((a) => (
                        <li key={a.id} className="border-l-2 border-guardian-gold/60 pl-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {titleCase(a.activity_type)}
                              {a.outcome && (
                                <span className="font-normal text-muted-foreground">
                                  {" "}
                                  — {a.outcome}
                                </span>
                              )}
                            </span>
                            <time className="shrink-0 text-xs text-muted-foreground">
                              {fmtDateTime(a.created_at)}
                            </time>
                          </div>
                          {a.notes && (
                            <p className="mt-0.5 text-sm text-foreground/90">{a.notes}</p>
                          )}
                          {a.next_action && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Next: {a.next_action}
                              {a.next_action_date ? ` (${formatDate(a.next_action_date)})` : ""}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </QueryState>
                </CardContent>
              </Card>
            </div>

            {/* Debts */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Debts</CardTitle>
                <span className="text-sm text-muted-foreground">
                  Total {formatCurrency(debtTotal)}
                </span>
              </CardHeader>
              <CardContent>
                <QueryState
                  isLoading={debts.isLoading}
                  error={debts.error}
                  isEmpty={(debts.data ?? []).length === 0}
                  emptyMessage="No debts recorded for this lead."
                >
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/50 text-left">
                        <tr>
                          <th className="px-3 py-2 font-medium">Creditor</th>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">Original</th>
                          <th className="px-3 py-2 font-medium">Current</th>
                          <th className="px-3 py-2 font-medium">Enrolled</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(debts.data ?? []).map((d) => (
                          <tr key={d.id} className="border-b last:border-0">
                            <td className="px-3 py-2">{d.creditor_name}</td>
                            <td className="px-3 py-2">{titleCase(d.account_type)}</td>
                            <td className="px-3 py-2">{formatCurrency(d.original_balance)}</td>
                            <td className="px-3 py-2">{formatCurrency(d.current_balance)}</td>
                            <td className="px-3 py-2">{d.is_enrolled ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </QueryState>
              </CardContent>
            </Card>

            <LeadDetailDialog lead={lead.data} open={editing} onOpenChange={setEditing} />
          </>
        )}
      </QueryState>
    </div>
  );
}
