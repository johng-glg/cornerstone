import { useLiabilities } from "@/hooks/useCoreCrm";
import { QueryState } from "@/components/common/QueryState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency, titleCase } from "@/lib/format";

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
                  <td className="px-3 py-2">{titleCase(l.liability_type)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-3 py-2">{formatCurrency(l.current_balance)}</td>
                  <td className="px-3 py-2">{formatCurrency(l.enrolled_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
