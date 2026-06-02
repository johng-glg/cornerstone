import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients } from "@/hooks/useCoreCrm";
import { QueryState } from "@/components/common/QueryState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { NewClientDialog } from "@/components/clients/NewClientDialog";
import { Input } from "@/components/ui/input";

export default function Clients() {
  const { data, isLoading, error } = useClients();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((c) =>
      `${c.first_name} ${c.last_name} ${c.email ?? ""}`.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <NewClientDialog />
      </div>
      {(data?.length ?? 0) > 0 && (
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="max-w-xs"
        />
      )}
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage={search ? "No matches." : "No clients yet."}
      >
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Forth</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                >
                  <td className="px-3 py-2">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={c.status ?? (c.is_active ? "active" : "inactive")} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{c.forth_crm_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
