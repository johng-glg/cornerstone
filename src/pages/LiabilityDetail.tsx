import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  useLiability,
  useLiabilityActions,
  useAddMatter,
  useMyStaffId,
} from "@/hooks/useLiabilityDetail";
import { useSettlements, useAddSettlement } from "@/hooks/useSettlements";
import { useEntityNotes, useAddNote } from "@/hooks/useLeadTabs";
import { useLitigationTeams, useStaffList } from "@/hooks/useModules";
import { QueryState } from "@/components/common/QueryState";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

function SettlementsTab({ liabilityId }: { liabilityId: string }) {
  const q = useSettlements([liabilityId]);
  const add = useAddSettlement();
  const rows = q.data ?? [];
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <QuickFormDialog
          trigger={<Button size="sm">New offer</Button>}
          title="New settlement offer"
          pending={add.isPending}
          fields={[
            { name: "offer_amount", label: "Offer amount", type: "number", required: true },
            { name: "offer_percentage", label: "Offer %", type: "number" },
            { name: "number_of_payments", label: "# payments", type: "number" },
            { name: "notes", label: "Notes", type: "textarea" },
          ]}
          onSubmit={async (v) => {
            try {
              await add.mutateAsync({
                liability_id: liabilityId,
                offer_amount: Number(v.offer_amount),
                offer_percentage: v.offer_percentage ? Number(v.offer_percentage) : null,
                number_of_payments: v.number_of_payments ? Number(v.number_of_payments) : null,
                notes: v.notes || null,
              });
              toast.success("Settlement offer added.");
            } catch (e) {
              toast.error((e as Error).message);
              throw e;
            }
          }}
        />
      </div>
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
                <th className="px-3 py-2 font-medium">Payments</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Offered</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{formatCurrency(s.offer_amount)}</td>
                  <td className="px-3 py-2">{s.offer_percentage ?? "—"}</td>
                  <td className="px-3 py-2">{s.number_of_payments ?? "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-3 py-2">{formatDate(s.offered_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}

function NotesTab({ liabilityId }: { liabilityId: string }) {
  const staffId = useMyStaffId();
  const q = useEntityNotes("liability", liabilityId);
  const add = useAddNote("liability", liabilityId, staffId);
  const rows = q.data ?? [];
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <QuickFormDialog
          trigger={<Button size="sm">New note</Button>}
          title="Add note"
          pending={add.isPending}
          fields={[
            { name: "content", label: "Note", type: "textarea", required: true, full: true },
          ]}
          onSubmit={async (v) => {
            try {
              await add.mutateAsync({ content: v.content });
              toast.success("Note added.");
            } catch (e) {
              toast.error((e as Error).message);
              throw e;
            }
          }}
        />
      </div>
      <QueryState
        isLoading={q.isLoading}
        error={q.error}
        isEmpty={rows.length === 0}
        emptyMessage="No notes yet."
      >
        <ul className="space-y-2">
          {rows.map((n) => (
            <li key={n.id} className="rounded-md border p-3">
              <p className="whitespace-pre-wrap text-sm">{n.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
            </li>
          ))}
        </ul>
      </QueryState>
    </div>
  );
}

function HistoryTab({ liabilityId }: { liabilityId: string }) {
  const q = useLiabilityActions(liabilityId);
  const rows = q.data ?? [];
  return (
    <QueryState
      isLoading={q.isLoading}
      error={q.error}
      isEmpty={rows.length === 0}
      emptyMessage="No recorded actions yet."
    >
      <ul className="space-y-2">
        {rows.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{titleCase(a.action_type)}</p>
              {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {a.amount != null && <p>{formatCurrency(a.amount)}</p>}
              <p>{formatDate(a.created_at)}</p>
            </div>
          </li>
        ))}
      </ul>
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
  const teamOpts = (teams.data ?? []).map((t) => ({ value: t.id, label: t.name }));
  const staffOpts = (staff.data ?? []).map((s) => ({
    value: s.id,
    label: `${s.first_name} ${s.last_name}`,
  }));
  return (
    <QuickFormDialog
      trigger={<Button size="sm">Open litigation matter</Button>}
      title="Open litigation matter"
      description="Creates a matter on this debt and routes it to a team and attorney."
      pending={add.isPending}
      fields={[
        { name: "case_number", label: "Case #", full: true },
        { name: "court_name", label: "Court" },
        { name: "state", label: "State" },
        { name: "opposing_party", label: "Opposing party", full: true },
        { name: "team_id", label: "Team", type: "select", required: true, options: teamOpts },
        { name: "staff_id", label: "Attorney", type: "select", required: true, options: staffOpts },
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
            state: v.state || null,
            opposing_party: v.opposing_party || null,
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
  const q = useLiability(id);
  const l = q.data;

  return (
    <div className="space-y-4">
      <Link
        to="/liabilities"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to liabilities
      </Link>

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
                  <StatusBadge status={l.status} />
                </h1>
                <p className="text-sm text-muted-foreground">
                  {l.creditor?.name ?? "—"}
                  {l.account_number ? ` · acct ${l.account_number}` : ""}
                </p>
              </div>
              <OpenMatterAction liabilityId={l.id} clientServiceId={l.client_service_id} />
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

            <Tabs defaultValue="settlements">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="settlements">Settlements</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="settlements" className="pt-4">
                <SettlementsTab liabilityId={l.id} />
              </TabsContent>
              <TabsContent value="notes" className="pt-4">
                <NotesTab liabilityId={l.id} />
              </TabsContent>
              <TabsContent value="history" className="pt-4">
                <HistoryTab liabilityId={l.id} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </QueryState>
    </div>
  );
}
