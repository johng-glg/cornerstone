import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useLitigationMatters } from "@/hooks/useDomains";
import { useLiabilities } from "@/hooks/useCoreCrm";
import { useLitigationTeams, useStaffList } from "@/hooks/useModules";
import { useAddMatter } from "@/hooks/useLiabilityDetail";
import { QueryState } from "@/components/common/QueryState";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

function NewMatterAction() {
  const navigate = useNavigate();
  const add = useAddMatter();
  const liabilities = useLiabilities();
  const teams = useLitigationTeams();
  const staff = useStaffList();

  const liabRows = liabilities.data ?? [];
  const liabOpts = liabRows.map((l) => ({
    value: l.id,
    label: `${titleCase(l.liability_type)} · ${formatCurrency(l.current_balance)} · ${l.status}`,
  }));

  return (
    <QuickFormDialog
      trigger={<Button size="sm">New matter</Button>}
      title="Open litigation matter"
      description="Pick the enrolled debt being litigated, then route it to a team and attorney."
      pending={add.isPending}
      fields={[
        { name: "liability_id", label: "Debt", type: "select", required: true, options: liabOpts },
        {
          name: "team_id",
          label: "Team",
          type: "select",
          required: true,
          options: (teams.data ?? []).map((t) => ({ value: t.id, label: t.name })),
        },
        {
          name: "staff_id",
          label: "Attorney",
          type: "select",
          required: true,
          options: (staff.data ?? []).map((s) => ({
            value: s.id,
            label: `${s.first_name} ${s.last_name}`,
          })),
        },
        { name: "case_number", label: "Case #", full: true },
        { name: "court_name", label: "Court" },
        { name: "state", label: "State" },
        { name: "opposing_party", label: "Opposing party", full: true },
      ]}
      onSubmit={async (v) => {
        const liab = liabRows.find((l) => l.id === v.liability_id);
        if (!liab) {
          toast.error("Select a debt.");
          throw new Error("no liability");
        }
        try {
          const matterId = await add.mutateAsync({
            liability_id: liab.id,
            client_service_id: liab.client_service_id,
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

export default function Litigation() {
  const { data, isLoading, error } = useLitigationMatters();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((m) =>
      `${m.case_number ?? ""} ${m.court_name ?? ""} ${m.opposing_party ?? ""} ${m.status}`
        .toLowerCase()
        .includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Litigation</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/court-calendar" className="text-guardian-gold hover:underline">
            Court calendar
          </Link>
          <Link to="/litigation-teams" className="text-guardian-gold hover:underline">
            Teams
          </Link>
          <NewMatterAction />
        </div>
      </div>
      {(data?.length ?? 0) > 0 && (
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search case #, court, opposing party…"
          className="max-w-xs"
        />
      )}
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage={search ? "No matches." : "No litigation matters yet."}
      >
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Case #</th>
                <th className="px-3 py-2 font-medium">Court</th>
                <th className="px-3 py-2 font-medium">Opposing party</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Response due</th>
                <th className="px-3 py-2 font-medium">Next hearing</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => navigate(`/litigation/${m.id}`)}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                >
                  <td className="px-3 py-2 font-mono text-xs">{m.case_number ?? "—"}</td>
                  <td className="px-3 py-2">{m.court_name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.opposing_party ?? "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-3 py-2">{formatDate(m.response_deadline)}</td>
                  <td className="px-3 py-2">{formatDate(m.next_hearing_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
