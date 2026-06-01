import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Target, Pencil, ArrowRightCircle } from "lucide-react";
import { useLead, useLeadActivities, useLeadDebts, useDeleteLeadDebt } from "@/hooks/useLeadDetail";
import { useUpdateLead } from "@/hooks/useCoreCrm";
import type { LeadDetailRow, LeadStatus } from "@/lib/db-types";
import { QueryState } from "@/components/common/QueryState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LeadDetailDialog } from "@/components/leads/LeadDetailDialog";
import { LogActivityForm } from "@/components/leads/LogActivityForm";
import { AddDebtDialog } from "@/components/leads/AddDebtDialog";
import { NotesTab } from "@/components/leads/tabs/NotesTab";
import { TasksTab } from "@/components/leads/tabs/TasksTab";
import { BudgetTab } from "@/components/leads/tabs/BudgetTab";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

const WORKFLOW: LeadStatus[] = ["new", "contacted", "qualified", "converted"];

function scoreLabel(score: number | null): { text: string; tint: string } {
  const s = score ?? 0;
  if (s >= 70) return { text: "Hot — High potential", tint: "bg-green-100 text-green-800" };
  if (s >= 40) return { text: "Warm — Moderate potential", tint: "bg-amber-100 text-amber-800" };
  return { text: "Cold — Low potential", tint: "bg-gray-100 text-gray-700" };
}

// Standard scoring model (matches the default profile). Shown as the score's contributing
// factors; the headline number is the server-computed lead_score.
function scoreFactors(lead: LeadDetailRow): Array<{ label: string; points: number }> {
  const f: Array<{ label: string; points: number }> = [];
  if (lead.email) f.push({ label: "Email Provided", points: 5 });
  if (lead.estimated_debt_amount) f.push({ label: "Estimated Debt", points: 20 });
  if (lead.phone) f.push({ label: "Phone Provided", points: 5 });
  if (lead.source && lead.source !== "other") f.push({ label: "Source Quality", points: 8 });
  if (lead.number_of_debts) f.push({ label: "Number of Debts", points: 10 });
  return f;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
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
  const deleteDebt = useDeleteLeadDebt(id ?? "");
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
    <div className="space-y-5">
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
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  className="bg-guardian-gold text-guardian-navy hover:bg-guardian-gold/90"
                  onClick={() =>
                    toast("Enrollment wizard coming next", {
                      description:
                        "The 8-step Consumer Defense enrollment (eligibility → review) is the next build.",
                    })
                  }
                >
                  <ArrowRightCircle className="mr-1 h-3.5 w-3.5" /> Convert
                </Button>
              </div>
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

            <Tabs defaultValue="details">
              <TabsList className="flex-wrap">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="docs">Docs</TabsTrigger>
                <TabsTrigger value="budget">Budget</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              {/* DETAILS */}
              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-4 w-4" /> Lead Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3 flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
                          scoreLabel(lead.data.lead_score).tint,
                        )}
                      >
                        {lead.data.lead_score ?? 0}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {scoreLabel(lead.data.lead_score).text}
                      </span>
                    </div>
                    <div className="divide-y">
                      {scoreFactors(lead.data).map((f) => (
                        <div
                          key={f.label}
                          className="flex items-center justify-between py-1.5 text-sm"
                        >
                          <span>{f.label}</span>
                          <span className="font-medium text-green-700">+{f.points}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p className="text-guardian-gold">{lead.data.phone ?? "—"}</p>
                      <p className="text-guardian-gold">{lead.data.email ?? "—"}</p>
                      <p className="text-muted-foreground">State: {lead.data.state ?? "—"}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Qualification Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Row label="Interest Type" value={titleCase(lead.data.interest_type)} />
                      <Row label="Lead Source" value={titleCase(lead.data.source)} />
                      <Row
                        label="Estimated Debt"
                        value={formatCurrency(lead.data.estimated_debt_amount)}
                      />
                      <Row label="Number of Debts" value={lead.data.number_of_debts ?? "—"} />
                      <Row
                        label="Monthly Income"
                        value={formatCurrency(lead.data.monthly_income)}
                      />
                      <Row
                        label="Employment"
                        value={
                          lead.data.employment_status ? titleCase(lead.data.employment_status) : "—"
                        }
                      />
                    </CardContent>
                  </Card>
                </div>

                {lead.data.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm">{lead.data.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Debts */}
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">Debts</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        Total {formatCurrency(debtTotal)}
                      </span>
                    </div>
                    {id && <AddDebtDialog leadId={id} />}
                  </CardHeader>
                  <CardContent>
                    <QueryState
                      isLoading={debts.isLoading}
                      error={debts.error}
                      isEmpty={(debts.data ?? []).length === 0}
                      emptyMessage="No debts recorded yet — use “Add debt” to enter one."
                    >
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                          <thead className="border-b bg-muted/50 text-left">
                            <tr>
                              <th className="px-3 py-2 font-medium">Creditor</th>
                              <th className="px-3 py-2 font-medium">Type</th>
                              <th className="px-3 py-2 font-medium">Acct</th>
                              <th className="px-3 py-2 font-medium">Original</th>
                              <th className="px-3 py-2 font-medium">Current</th>
                              <th className="px-3 py-2 font-medium">Enrolled</th>
                              <th className="px-3 py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {(debts.data ?? []).map((d) => (
                              <tr key={d.id} className="border-b last:border-0">
                                <td className="px-3 py-2">{d.creditor_name}</td>
                                <td className="px-3 py-2">{titleCase(d.account_type)}</td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {d.account_number_last4 ? `••••${d.account_number_last4}` : "—"}
                                </td>
                                <td className="px-3 py-2">{formatCurrency(d.original_balance)}</td>
                                <td className="px-3 py-2">{formatCurrency(d.current_balance)}</td>
                                <td className="px-3 py-2">{d.is_enrolled ? "Yes" : "No"}</td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    disabled={deleteDebt.isPending}
                                    onClick={() => {
                                      if (!confirm(`Remove the ${d.creditor_name} debt?`)) return;
                                      deleteDebt.mutate(
                                        { id: d.id },
                                        {
                                          onSuccess: () => toast.success("Debt removed."),
                                          onError: (e) => toast.error(e.message),
                                        },
                                      );
                                    }}
                                    className="text-xs text-destructive hover:underline disabled:opacity-50"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </QueryState>
                  </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground">
                  Created {formatDate(lead.data.created_at)}
                </p>
              </TabsContent>

              {/* NOTES / TASKS / BUDGET */}
              <TabsContent value="notes">{id && <NotesTab leadId={id} />}</TabsContent>
              <TabsContent value="tasks">{id && <TasksTab leadId={id} />}</TabsContent>
              <TabsContent value="budget">{id && <BudgetTab leadId={id} />}</TabsContent>

              {/* DOCS */}
              <TabsContent value="docs">
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Document uploads arrive with the secure-storage wiring (alongside the enrollment
                    flow). Debts and budget capture the financials in the meantime.
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ACTIVITY */}
              <TabsContent value="activity" className="space-y-4">
                {id && <LogActivityForm leadId={id} />}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Stage History</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <Row label="New" value={formatDate(lead.data.created_at)} />
                    {lead.data.contacted_at && (
                      <Row label="Contacted" value={formatDate(lead.data.contacted_at)} />
                    )}
                    {lead.data.qualified_at && (
                      <Row label="Qualified" value={formatDate(lead.data.qualified_at)} />
                    )}
                    {lead.data.converted_at && (
                      <Row label="Converted" value={formatDate(lead.data.converted_at)} />
                    )}
                  </CardContent>
                </Card>
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
                        {a.notes && <p className="mt-0.5 text-sm text-foreground/90">{a.notes}</p>}
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
              </TabsContent>
            </Tabs>

            <LeadDetailDialog lead={lead.data} open={editing} onOpenChange={setEditing} />
          </>
        )}
      </QueryState>
    </div>
  );
}
