import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLeads } from "@/hooks/useCoreCrm";
import type { LeadStatus } from "@/lib/db-types";
import { QueryState } from "@/components/common/QueryState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { NewLeadDialog } from "@/components/leads/NewLeadDialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, titleCase } from "@/lib/format";

const STATUS_FILTERS: Array<LeadStatus | "all"> = [
  "all",
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
];

export default function Leads() {
  const { data, isLoading, error } = useLeads();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (!q) return true;
      return (
        `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q) ||
        l.lead_number.toLowerCase().includes(q)
      );
    });
  }, [data, search, status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <NewLeadDialog />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name, email, or lead #…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All statuses" : titleCase(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{rows.length} shown</span>
      </div>

      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage={data && data.length > 0 ? "No leads match your filters." : "No leads yet."}
      >
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Lead #</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Interest</th>
                <th className="px-3 py-2 font-medium">Est. debt</th>
                <th className="px-3 py-2 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => navigate(`/leads/${l.id}`)}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                >
                  <td className="px-3 py-2 font-mono text-xs">{l.lead_number}</td>
                  <td className="px-3 py-2">
                    {l.first_name} {l.last_name}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{titleCase(l.interest_type)}</td>
                  <td className="px-3 py-2">{formatCurrency(l.estimated_debt_amount)}</td>
                  <td className="px-3 py-2">{l.lead_score ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
