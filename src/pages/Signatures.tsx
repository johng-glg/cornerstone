import { useSignatureRequests } from "@/hooks/useDomains";
import { QueryState } from "@/components/common/QueryState";

function fmtDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default function Signatures() {
  const { data, isLoading, error } = useSignatureRequests();
  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Signatures</h1>
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="No signature requests yet."
      >
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">For</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{r.title}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.entity_type}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">{fmtDate(r.completed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
