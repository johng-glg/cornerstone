import type { UseQueryResult } from "@tanstack/react-query";
import { useActivityLog, useClientActivity, type ActivityRow } from "@/hooks/useActivityLog";
import { QueryState } from "@/components/common/QueryState";
import { formatDateTime, titleCase } from "@/lib/format";

/** Presentational timeline (newest-first), shared by the per-entity and client-rollup feeds. */
function ActivityList({ q }: { q: UseQueryResult<ActivityRow[], Error> }) {
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

/** Activity timeline for a single record (e.g. a liability or matter). */
export function ActivityFeed({ entityType, entityId }: { entityType: string; entityId: string }) {
  return <ActivityList q={useActivityLog(entityType, entityId)} />;
}

/** Rolled-up activity timeline for a client (its own events + stamped child-record events). */
export function ClientActivityFeed({ clientId }: { clientId: string }) {
  return <ActivityList q={useClientActivity(clientId)} />;
}
