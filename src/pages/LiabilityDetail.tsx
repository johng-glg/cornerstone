import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useLiability, useAddMatter } from "@/hooks/useLiabilityDetail";
import {
  useSettlements,
  useUpdateSettlementStatus,
  type SettlementRow,
  type SettlementTransition,
} from "@/hooks/useSettlements";
import { SettlementBuilderDialog } from "@/components/settlements/SettlementBuilderDialog";
import { useLitigationTeams, useStaffList, useCreditors } from "@/hooks/useModules";
import { NotesTab } from "@/components/leads/tabs/NotesTab";
import { useRecordActivity } from "@/hooks/useActivityLog";
import { AssignmentsPanel } from "@/components/common/AssignmentsPanel";
import { ActivityFeed } from "@/components/common/ActivityFeed";
import { QueryState } from "@/components/common/QueryState";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StatusChanger } from "@/components/common/StatusChanger";
import { STATUS_OPTIONS } from "@/lib/statuses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

// Radix Select rejects empty-string values, so "no creditor" uses this sentinel.
const NO_CREDITOR = "__none__";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

function SettlementActions({
  s,
  liabilityId,
  clientId,
}: {
  s: SettlementRow;
  liabilityId: string;
  clientId?: string | null;
}) {
  const update = useUpdateSettlementStatus();
  const record = useRecordActivity();
  const run = (transition: SettlementTransition, description: string, toastMsg: string) =>
    update.mutate(
      { id: s.id, transition },
      {
        onSuccess: () => {
          void record({
            entityType: "liability",
            entityId: liabilityId,
            clientId,
            category: "settlement",
            description,
            metadata: { settlement_id: s.id, transition },
          });
          toast.success(toastMsg);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  const amt = formatCurrency(s.offer_amount);
  const btns: React.ReactNode[] = [];
  if (s.status === "offered") {
    btns.push(
      <Button
        key="accept"
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={update.isPending}
        onClick={() => run("accepted", `Settlement of ${amt} accepted`, "Accepted.")}
      >
        Accept
      </Button>,
      <Button
        key="reject"
        size="sm"
        variant="outline"
        className="h-7 text-xs text-destructive"
        disabled={update.isPending}
        onClick={() => run("rejected", `Settlement offer of ${amt} rejected`, "Rejected.")}
      >
        Reject
      </Button>,
    );
  }
  if (s.status === "accepted" && !s.attorney_approved) {
    btns.push(
      <Button
        key="approve"
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={update.isPending}
        onClick={() => run("approve", `Settlement of ${amt} approved by attorney`, "Approved.")}
      >
        Attorney approve
      </Button>,
    );
  }
  if (s.status === "accepted") {
    btns.push(
      <Button
        key="complete"
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={update.isPending}
        onClick={() => run("completed", `Settlement of ${amt} marked completed`, "Completed.")}
      >
        Mark completed
      </Button>,
    );
  }
  return btns.length ? <span className="flex flex-wrap gap-1">{btns}</span> : <span>—</span>;
}

function SettlementsTable({
  liabilityId,
  clientId,
}: {
  liabilityId: string;
  clientId?: string | null;
}) {
  const q = useSettlements([liabilityId]);
  const rows = q.data ?? [];
  return (
    <QueryState
      isLoading={q.isLoading}
      error={q.error}
      isEmpty={rows.length === 0}
      emptyMessage="No settlement offers yet."
    >
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">%</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Schedule</th>
              <th className="px-3 py-2 font-medium">Attorney</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Offered</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b last:border-0 align-top">
                <td className="px-3 py-2">{formatCurrency(s.offer_amount)}</td>
                <td className="px-3 py-2">{s.offer_percentage ?? "—"}</td>
                <td className="px-3 py-2">{titleCase(s.payment_type)}</td>
                <td className="px-3 py-2">
                  {s.payment_type === "payment_plan"
                    ? `${s.number_of_payments ?? 0} payment(s)${
                        s.first_payment_date ? ` from ${formatDate(s.first_payment_date)}` : ""
                      }`
                    : "—"}
                </td>
                <td className="px-3 py-2">{s.attorney_approved ? "Approved" : "—"}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-3 py-2">{formatDate(s.offered_date)}</td>
                <td className="px-3 py-2">
                  <SettlementActions s={s} liabilityId={liabilityId} clientId={clientId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </QueryState>
  );
}

function OpenMatterAction({
  liabilityId,
  clientServiceId,
}: {
  liabilityId: string;
  clientServiceId: string;
}) {
  const navigate = useNavigate();
  const add = useAddMatter();
  const teams = useLitigationTeams();
  const staff = useStaffList();
  const creditors = useCreditors();
  const teamOpts = (teams.data ?? []).map((t) => ({ value: t.id, label: t.name }));
  const staffOpts = (staff.data ?? []).map((s) => ({
    value: s.id,
    label: `${s.first_name} ${s.last_name}`,
  }));
  return (
    <QuickFormDialog
      trigger={
        <Button size="sm" variant="outline">
          Mark Legal
        </Button>
      }
      title="Open litigation matter"
      description="Creates a matter on this debt and routes it to a team and attorney."
      pending={add.isPending}
      fields={[
        { name: "team_id", label: "Team", type: "select", required: true, options: teamOpts },
        { name: "staff_id", label: "Attorney", type: "select", required: true, options: staffOpts },
        { name: "case_number", label: "Case #" },
        { name: "court_name", label: "Court" },
        { name: "county", label: "County" },
        { name: "state", label: "State" },
        { name: "opposing_party", label: "Opposing party (plaintiff)", full: true },
        { name: "opposing_counsel", label: "Opposing counsel", full: true },
        {
          name: "opposing_creditor_id",
          label: "Opposing creditor",
          type: "select",
          defaultValue: NO_CREDITOR,
          options: [
            { value: NO_CREDITOR, label: "— None —" },
            ...(creditors.data ?? []).map((c) => ({ value: c.id, label: c.name })),
          ],
        },
        { name: "service_date", label: "Service date", type: "date" },
        { name: "response_deadline", label: "Response deadline", type: "date" },
      ]}
      onSubmit={async (v) => {
        try {
          const matterId = await add.mutateAsync({
            liability_id: liabilityId,
            client_service_id: clientServiceId,
            team_id: v.team_id,
            staff_id: v.staff_id,
            case_number: v.case_number || null,
            court_name: v.court_name || null,
            county: v.county || null,
            state: v.state || null,
            opposing_party: v.opposing_party || null,
            opposing_counsel: v.opposing_counsel || null,
            opposing_creditor_id:
              v.opposing_creditor_id && v.opposing_creditor_id !== NO_CREDITOR
                ? v.opposing_creditor_id
                : null,
            service_date: v.service_date || null,
            response_deadline: v.response_deadline || null,
          });
          toast.success("Litigation matter opened.");
          navigate(`/litigation/${matterId}`);
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

export default function LiabilityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const q = useLiability(id);
  const l = q.data;
  const clientId = l?.client_service?.primary_client_id ?? null;

  // Go back to wherever we came from (e.g. a client record) when there's in-app history;
  // fall back to the liabilities list on a fresh/direct load (location.key === "default").
  const goBack = () => (location.key === "default" ? navigate("/liabilities") : navigate(-1));

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <QueryState
        isLoading={q.isLoading}
        error={q.error}
        isEmpty={!l}
        emptyMessage="Debt not found."
      >
        {l && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold">
                  {titleCase(l.liability_type)}
                  <StatusChanger
                    table="liabilities"
                    id={l.id}
                    current={l.status}
                    options={STATUS_OPTIONS.liabilities}
                    entityType="liability"
                    entityId={l.id}
                    clientId={clientId}
                    invalidateKeys={[["liability", l.id]]}
                  />
                </h1>
                <p className="text-sm text-muted-foreground">
                  {l.creditor?.name ?? "—"}
                  {l.account_number ? ` · acct ${l.account_number}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SettlementBuilderDialog
                  liabilityId={l.id}
                  clientServiceId={l.client_service_id}
                  clientId={clientId}
                  enrolledBalance={l.enrolled_balance}
                  currentBalance={l.current_balance}
                  creditorName={l.creditor?.name ?? null}
                  accountNumber={l.account_number}
                />
                <OpenMatterAction liabilityId={l.id} clientServiceId={l.client_service_id} />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Balances</CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                  <Field label="Original">{formatCurrency(l.original_balance ?? 0)}</Field>
                  <Field label="Current">{formatCurrency(l.current_balance ?? 0)}</Field>
                  <Field label="Enrolled">{formatCurrency(l.enrolled_balance ?? 0)}</Field>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                  <Field label="Creditor">{l.creditor?.name ?? "—"}</Field>
                  <Field label="Summons received">{formatDate(l.summons_received_at)}</Field>
                  <Field label="Engagement">
                    <Link
                      to={`/engagements/${l.client_service_id}`}
                      className="text-guardian-gold hover:underline"
                    >
                      View
                    </Link>
                  </Field>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Settlements (offers)</CardTitle>
              </CardHeader>
              <CardContent>
                <SettlementsTable liabilityId={l.id} clientId={clientId} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <AssignmentsPanel entityType="liability" entityId={l.id} clientId={clientId} />
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActivityFeed entityType="liability" entityId={l.id} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <NotesTab entityType="liability" entityId={l.id} />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
