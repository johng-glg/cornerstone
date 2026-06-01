import { useTransactions } from "@/hooks/useCoreCrm";
import { QueryState } from "@/components/common/QueryState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate, titleCase } from "@/lib/format";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function Transactions() {
  const { data, isLoading, error } = useTransactions();
  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Transactions</h1>
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="No transactions yet."
      >
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Scheduled</th>
                <th className="px-3 py-2 font-medium">Processed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{titleCase(t.transaction_type)}</td>
                  <td className="px-3 py-2">{usd.format(t.amount)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-3 py-2">{formatDate(t.scheduled_date)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(t.processed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
