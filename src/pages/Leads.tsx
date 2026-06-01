import { useLeads } from "@/hooks/useCoreCrm";
import { QueryState } from "@/components/common/QueryState";
import { NewLeadDialog } from "@/components/leads/NewLeadDialog";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function Leads() {
  const { data, isLoading, error } = useLeads();
  const rows = data ?? [];

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
                <tr key={l.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{l.lead_number}</td>
                  <td className="px-3 py-2">
                    {l.first_name} {l.last_name}
                  </td>
                  <td className="px-3 py-2">{l.status}</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.interest_type}</td>
                  <td className="px-3 py-2">
                    {l.estimated_debt_amount != null ? usd.format(l.estimated_debt_amount) : "—"}
                  </td>
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
