import { useTemplates } from "@/hooks/useDomains";
import { QueryState } from "@/components/common/QueryState";

export default function Templates() {
  const { data, isLoading, error } = useTemplates();
  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Templates</h1>
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="No templates yet."
      >
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Language</th>
                <th className="px-3 py-2 font-medium">Version</th>
                <th className="px-3 py-2 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{t.name}</td>
                  <td className="px-3 py-2">{t.template_type}</td>
                  <td className="px-3 py-2 uppercase text-muted-foreground">{t.language}</td>
                  <td className="px-3 py-2">v{t.current_version}</td>
                  <td className="px-3 py-2">{t.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
