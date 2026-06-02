import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  useMatter,
  useMatterHearings,
  useMatterActivities,
  useMatterDocuments,
  useFilingFees,
  useAppearances,
} from "@/hooks/useLitigationDetail";
import {
  useAddHearing,
  useAddMatterActivity,
  useAddFilingFee,
  useAddMatterDocument,
  useAddAppearance,
} from "@/hooks/useModuleMutations";
import { QueryState } from "@/components/common/QueryState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

function ScheduleHearingAction({ matterId }: { matterId: string }) {
  const add = useAddHearing(matterId);
  return (
    <QuickFormDialog
      trigger={
        <Button size="sm" variant="outline">
          Schedule hearing
        </Button>
      }
      title="Schedule hearing"
      pending={add.isPending}
      fields={[
        {
          name: "hearing_type",
          label: "Type",
          type: "select",
          required: true,
          defaultValue: "status_conference",
          options: [
            "status_conference",
            "trial",
            "motion",
            "mediation",
            "case_management",
            "other",
          ].map((v) => ({ value: v, label: titleCase(v) })),
        },
        { name: "scheduled_date", label: "Date", type: "date" },
        { name: "location", label: "Location", full: true },
        { name: "judge_name", label: "Judge" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      onSubmit={async (v) => {
        try {
          await add.mutateAsync({
            hearing_type: v.hearing_type,
            scheduled_date: v.scheduled_date,
            location: v.location,
            judge_name: v.judge_name,
            notes: v.notes,
          });
          toast.success("Hearing scheduled.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

function LogMatterActivityAction({ matterId }: { matterId: string }) {
  const add = useAddMatterActivity(matterId);
  return (
    <QuickFormDialog
      trigger={
        <Button size="sm" variant="outline">
          Log activity
        </Button>
      }
      title="Log activity"
      pending={add.isPending}
      fields={[
        {
          name: "activity_type",
          label: "Type",
          type: "select",
          required: true,
          defaultValue: "filing",
          options: ["filing", "call", "correspondence", "research", "appearance", "other"].map(
            (v) => ({ value: v, label: titleCase(v) }),
          ),
        },
        { name: "description", label: "Description", type: "textarea", required: true },
        { name: "outcome", label: "Outcome", full: true },
      ]}
      onSubmit={async (v) => {
        try {
          await add.mutateAsync({
            activity_type: v.activity_type,
            description: v.description,
            outcome: v.outcome,
          });
          toast.success("Activity logged.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

function AddFilingFeeAction({ matterId }: { matterId: string }) {
  const add = useAddFilingFee(matterId);
  return (
    <QuickFormDialog
      trigger={
        <Button size="sm" variant="outline">
          Add filing fee
        </Button>
      }
      title="Add filing fee"
      pending={add.isPending}
      fields={[
        { name: "amount", label: "Amount ($)", type: "number", required: true },
        { name: "description", label: "Description", required: true, full: true },
      ]}
      onSubmit={async (v) => {
        try {
          await add.mutateAsync({ amount: Number(v.amount) || 0, description: v.description });
          toast.success("Filing fee added.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

function AddMatterDocAction({ matterId }: { matterId: string }) {
  const add = useAddMatterDocument(matterId);
  return (
    <QuickFormDialog
      trigger={
        <Button size="sm" variant="outline">
          Add document
        </Button>
      }
      title="Add document"
      pending={add.isPending}
      fields={[
        { name: "title", label: "Title", required: true, full: true },
        {
          name: "document_type",
          label: "Type",
          type: "select",
          defaultValue: "pleading",
          options: ["pleading", "motion", "order", "correspondence", "evidence", "other"].map(
            (v) => ({ value: v, label: titleCase(v) }),
          ),
        },
        { name: "file_url", label: "Document URL", full: true, placeholder: "https://…" },
      ]}
      onSubmit={async (v) => {
        try {
          await add.mutateAsync({
            title: v.title,
            document_type: v.document_type,
            file_url: v.file_url,
          });
          toast.success("Document added.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

function RequestAppearanceAction({ matterId }: { matterId: string }) {
  const add = useAddAppearance(matterId);
  return (
    <QuickFormDialog
      trigger={
        <Button size="sm" variant="outline">
          Request appearance
        </Button>
      }
      title="Request appearance"
      pending={add.isPending}
      fields={[
        { name: "appearance_date", label: "Appearance date", type: "date", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
      ]}
      onSubmit={async (v) => {
        try {
          await add.mutateAsync({ appearance_date: v.appearance_date, description: v.description });
          toast.success("Appearance requested.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function LitigationDetail() {
  const { id } = useParams<{ id: string }>();
  const matter = useMatter(id);
  const hearings = useMatterHearings(id);
  const activities = useMatterActivities(id);
  const documents = useMatterDocuments(id);
  const fees = useFilingFees(id);
  const appearances = useAppearances(id);

  return (
    <div className="space-y-5">
      <Link
        to="/litigation"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to litigation
      </Link>

      <QueryState
        isLoading={matter.isLoading}
        error={matter.error}
        isEmpty={!matter.data}
        emptyMessage="Matter not found."
      >
        {matter.data && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold">{matter.data.case_number ?? "Matter"}</h1>
                  <StatusBadge status={matter.data.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {matter.data.court_name ?? "—"}
                  {matter.data.state ? ` · ${matter.data.state}` : ""}
                  {matter.data.opposing_party ? ` · vs ${matter.data.opposing_party}` : ""}
                </p>
              </div>
              <Link
                to={`/clients`}
                className="text-sm text-guardian-gold hover:underline"
                title="Engagement"
              >
                View engagement
              </Link>
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="hearings">Hearings</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="appearances">Appearances</TabsTrigger>
                <TabsTrigger value="fees">Filing Fees</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Case</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Row label="Case #" value={matter.data.case_number ?? "—"} />
                      <Row label="Court" value={matter.data.court_name ?? "—"} />
                      <Row label="County" value={matter.data.county ?? "—"} />
                      <Row label="State" value={matter.data.state ?? "—"} />
                      <Row label="Served" value={formatDate(matter.data.service_date)} />
                      <Row label="Response due" value={formatDate(matter.data.response_deadline)} />
                      <Row label="Next hearing" value={formatDate(matter.data.next_hearing_date)} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Opposition & amounts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Row label="Opposing party" value={matter.data.opposing_party ?? "—"} />
                      <Row label="Opposing counsel" value={matter.data.opposing_counsel ?? "—"} />
                      <Row label="Judgment" value={formatCurrency(matter.data.judgment_amount)} />
                      <Row
                        label="Settlement"
                        value={formatCurrency(matter.data.settlement_amount)}
                      />
                    </CardContent>
                  </Card>
                </div>
                {matter.data.notes && (
                  <Card className="mt-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm">{matter.data.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="hearings" className="space-y-3">
                {id && (
                  <div className="flex justify-end">
                    <ScheduleHearingAction matterId={id} />
                  </div>
                )}
                <QueryState
                  isLoading={hearings.isLoading}
                  error={hearings.error}
                  isEmpty={(hearings.data ?? []).length === 0}
                  emptyMessage="No hearings scheduled."
                >
                  <div className="space-y-2">
                    {(hearings.data ?? []).map((h) => (
                      <Card key={h.id}>
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{titleCase(h.hearing_type)}</span>
                            <time className="text-xs text-muted-foreground">
                              {formatDate(h.scheduled_date)}
                            </time>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {[h.location, h.judge_name && `Judge ${h.judge_name}`]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                          {h.outcome && <p className="text-sm">Outcome: {h.outcome}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </QueryState>
              </TabsContent>

              <TabsContent value="activity" className="space-y-3">
                {id && (
                  <div className="flex justify-end">
                    <LogMatterActivityAction matterId={id} />
                  </div>
                )}
                <QueryState
                  isLoading={activities.isLoading}
                  error={activities.error}
                  isEmpty={(activities.data ?? []).length === 0}
                  emptyMessage="No activity logged."
                >
                  <ol className="space-y-3">
                    {(activities.data ?? []).map((a) => (
                      <li key={a.id} className="border-l-2 border-guardian-gold/60 pl-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{titleCase(a.activity_type)}</span>
                          <time className="text-xs text-muted-foreground">
                            {formatDate(a.activity_date ?? a.created_at)}
                          </time>
                        </div>
                        {a.description && (
                          <p className="text-sm text-foreground/90">{a.description}</p>
                        )}
                        {a.outcome && (
                          <p className="text-xs text-muted-foreground">Outcome: {a.outcome}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                </QueryState>
              </TabsContent>

              <TabsContent value="appearances" className="space-y-3">
                {id && (
                  <div className="flex justify-end">
                    <RequestAppearanceAction matterId={id} />
                  </div>
                )}
                <QueryState
                  isLoading={appearances.isLoading}
                  error={appearances.error}
                  isEmpty={(appearances.data ?? []).length === 0}
                  emptyMessage="No appearance requests."
                >
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/50 text-left">
                        <tr>
                          <th className="px-3 py-2 font-medium">Appearance date</th>
                          <th className="px-3 py-2 font-medium">Description</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Requested</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(appearances.data ?? []).map((a) => (
                          <tr key={a.id} className="border-b last:border-0">
                            <td className="px-3 py-2">{formatDate(a.appearance_date)}</td>
                            <td className="px-3 py-2">{a.description}</td>
                            <td className="px-3 py-2">
                              <StatusBadge status={a.status} />
                            </td>
                            <td className="px-3 py-2">{formatDate(a.requested_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </QueryState>
              </TabsContent>

              <TabsContent value="fees" className="space-y-3">
                {id && (
                  <div className="flex justify-end">
                    <AddFilingFeeAction matterId={id} />
                  </div>
                )}
                <QueryState
                  isLoading={fees.isLoading}
                  error={fees.error}
                  isEmpty={(fees.data ?? []).length === 0}
                  emptyMessage="No filing fees recorded."
                >
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/50 text-left">
                        <tr>
                          <th className="px-3 py-2 font-medium">Description</th>
                          <th className="px-3 py-2 font-medium">Amount</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Requested</th>
                          <th className="px-3 py-2 font-medium">Paid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(fees.data ?? []).map((f) => (
                          <tr key={f.id} className="border-b last:border-0">
                            <td className="px-3 py-2">{f.description}</td>
                            <td className="px-3 py-2">{formatCurrency(f.amount)}</td>
                            <td className="px-3 py-2">
                              <StatusBadge status={f.status} />
                            </td>
                            <td className="px-3 py-2">{formatDate(f.requested_date)}</td>
                            <td className="px-3 py-2">{formatDate(f.paid_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </QueryState>
              </TabsContent>

              <TabsContent value="documents" className="space-y-3">
                {id && (
                  <div className="flex justify-end">
                    <AddMatterDocAction matterId={id} />
                  </div>
                )}
                <QueryState
                  isLoading={documents.isLoading}
                  error={documents.error}
                  isEmpty={(documents.data ?? []).length === 0}
                  emptyMessage="No documents."
                >
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/50 text-left">
                        <tr>
                          <th className="px-3 py-2 font-medium">Title</th>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">Filed</th>
                          <th className="px-3 py-2 font-medium">Deadline</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {(documents.data ?? []).map((d) => (
                          <tr key={d.id} className="border-b last:border-0">
                            <td className="px-3 py-2">{d.title}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {titleCase(d.document_type)}
                            </td>
                            <td className="px-3 py-2">{formatDate(d.filed_date)}</td>
                            <td className="px-3 py-2">{formatDate(d.deadline_date)}</td>
                            <td className="px-3 py-2 text-right">
                              <a
                                href={d.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-guardian-gold hover:underline"
                              >
                                Open
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
