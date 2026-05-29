import { useTransactions } from "@/hooks/useCoreCrm";
import { QueryState } from "@/components/common/QueryState";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function fmtDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

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
                  <td className="px-3 py-2">{t.transaction_type}</td>
                  <td className="px-3 py-2">{usd.format(t.amount)}</td>
                  <td className="px-3 py-2">{t.status}</td>
                  <td className="px-3 py-2">{fmtDate(t.scheduled_date)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtDate(t.processed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
