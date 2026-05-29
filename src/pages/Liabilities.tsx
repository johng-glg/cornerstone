import { useLiabilities } from "@/hooks/useCoreCrm";
import { QueryState } from "@/components/common/QueryState";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function Liabilities() {
  const { data, isLoading, error } = useLiabilities();
  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Liabilities</h1>
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="No liabilities yet."
      >
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Current balance</th>
                <th className="px-3 py-2 font-medium">Enrolled balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{l.liability_type}</td>
                  <td className="px-3 py-2">{l.status}</td>
                  <td className="px-3 py-2">
                    {l.current_balance != null ? usd.format(l.current_balance) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {l.enrolled_balance != null ? usd.format(l.enrolled_balance) : "—"}
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
