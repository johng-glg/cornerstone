import { useActivityLog } from "@/hooks/useActivityLog";
import { QueryState } from "@/components/common/QueryState";
import { formatDateTime, titleCase } from "@/lib/format";

/**
 * Reusable activity timeline for any record. Reads the unified activity_log for the given entity
 * and renders newest-first, showing who did what and when.
 */
export function ActivityFeed({ entityType, entityId }: { entityType: string; entityId: string }) {
  const q = useActivityLog(entityType, entityId);
  const rows = q.data ?? [];
  return (
    <QueryState
      isLoading={q.isLoading}
      error={q.error}
      isEmpty={rows.length === 0}
      emptyMessage="No activity recorded yet."
    >
      <ul className="space-y-2">
        {rows.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-4 rounded-md border p-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {titleCase(a.category)}
              </p>
              <p className="text-sm">{a.description}</p>
              {a.staff && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  by {a.staff.first_name} {a.staff.last_name}
                </p>
              )}
            </div>
            <p className="shrink-0 text-right text-xs text-muted-foreground">
              {formatDateTime(a.created_at)}
            </p>
          </li>
        ))}
      </ul>
    </QueryState>
  );
}
