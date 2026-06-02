import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLitigationMatters } from "@/hooks/useDomains";
import { QueryState } from "@/components/common/QueryState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

export default function Litigation() {
  const { data, isLoading, error } = useLitigationMatters();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((m) =>
      `${m.case_number ?? ""} ${m.court_name ?? ""} ${m.opposing_party ?? ""} ${m.status}`
        .toLowerCase()
        .includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Litigation</h1>
        <div className="flex gap-4 text-sm">
          <Link to="/court-calendar" className="text-guardian-gold hover:underline">
            Court calendar
          </Link>
          <Link to="/litigation-teams" className="text-guardian-gold hover:underline">
            Teams
          </Link>
        </div>
      </div>
      {(data?.length ?? 0) > 0 && (
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search case #, court, opposing party…"
          className="max-w-xs"
        />
      )}
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage={search ? "No matches." : "No litigation matters yet."}
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
                <tr
                  key={m.id}
                  onClick={() => navigate(`/litigation/${m.id}`)}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                >
                  <td className="px-3 py-2 font-mono text-xs">{m.case_number ?? "—"}</td>
                  <td className="px-3 py-2">{m.court_name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.opposing_party ?? "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-3 py-2">{formatDate(m.response_deadline)}</td>
                  <td className="px-3 py-2">{formatDate(m.next_hearing_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
