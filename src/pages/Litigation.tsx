import { useLitigationMatters } from "@/hooks/useDomains";
import { QueryState } from "@/components/common/QueryState";

function fmtDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default function Litigation() {
  const { data, isLoading, error } = useLitigationMatters();
  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Litigation</h1>
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="No litigation matters yet."
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
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{m.case_number ?? "—"}</td>
                  <td className="px-3 py-2">{m.court_name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.opposing_party ?? "—"}</td>
                  <td className="px-3 py-2">{m.status}</td>
                  <td className="px-3 py-2">{fmtDate(m.response_deadline)}</td>
                  <td className="px-3 py-2">{fmtDate(m.next_hearing_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
