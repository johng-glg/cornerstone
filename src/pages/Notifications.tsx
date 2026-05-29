import { useNotifications } from "@/hooks/useDomains";
import { QueryState } from "@/components/common/QueryState";

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString();
}

export default function Notifications() {
  const { data, isLoading, error } = useNotifications();
  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="No notifications yet."
      >
        <ul className="divide-y rounded-md border">
          {rows.map((n) => (
            <li key={n.id} className="flex items-start gap-3 px-3 py-2">
              <span
                aria-hidden
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  n.is_read ? "bg-muted" : "bg-primary"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${n.is_read ? "text-muted-foreground" : "font-medium"}`}>
                  {n.title}
                </p>
                {n.message && <p className="truncate text-xs text-muted-foreground">{n.message}</p>}
              </div>
              <time className="shrink-0 text-xs text-muted-foreground">
                {fmtDateTime(n.created_at)}
              </time>
            </li>
          ))}
        </ul>
      </QueryState>
    </div>
  );
}
