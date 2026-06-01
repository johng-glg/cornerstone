import { useState } from "react";
import { useLeads } from "@/hooks/useCoreCrm";
import type { LeadListRow } from "@/lib/db-types";
import { QueryState } from "@/components/common/QueryState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { NewLeadDialog } from "@/components/leads/NewLeadDialog";
import { LeadDetailDialog } from "@/components/leads/LeadDetailDialog";
import { formatCurrency, titleCase } from "@/lib/format";

export default function Leads() {
  const { data, isLoading, error } = useLeads();
  const rows = data ?? [];
  const [selected, setSelected] = useState<LeadListRow | null>(null);
  const [open, setOpen] = useState(false);

  const openLead = (lead: LeadListRow) => {
    setSelected(lead);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <NewLeadDialog />
      </div>
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="No leads yet."
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
                  onClick={() => openLead(l)}
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
      <LeadDetailDialog lead={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
