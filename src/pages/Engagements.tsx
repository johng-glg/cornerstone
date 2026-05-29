import { useClientServices } from "@/hooks/useCoreCrm";
import { QueryState } from "@/components/common/QueryState";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function fmtDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default function Engagements() {
  const { data, isLoading, error } = useClientServices();
  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Engagements</h1>
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="No engagements yet."
      >
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Engagement #</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Program</th>
                <th className="px-3 py-2 font-medium">Enrolled</th>
                <th className="px-3 py-2 font-medium">PLSA balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{s.service_number}</td>
                  <td className="px-3 py-2">{s.status}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.program_type ?? "—"}</td>
                  <td className="px-3 py-2">{fmtDate(s.enrolled_date)}</td>
                  <td className="px-3 py-2">
                    {s.escrow_balance != null ? usd.format(s.escrow_balance) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
