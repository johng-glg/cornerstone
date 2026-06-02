import { toast } from "sonner";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/useDomains";
import { QueryState } from "@/components/common/QueryState";
import { Button } from "@/components/ui/button";

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString();
}

export default function Notifications() {
  const { data, isLoading, error } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const rows = data ?? [];
  const unread = rows.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Notifications
          {unread > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 align-middle text-xs font-medium text-primary-foreground">
              {unread} new
            </span>
          )}
        </h1>
        <Button
          size="sm"
          variant="outline"
          disabled={unread === 0 || markAll.isPending}
          onClick={() =>
            markAll.mutate(undefined, {
              onSuccess: () => toast.success("All notifications marked read."),
              onError: (e) => toast.error(e.message),
            })
          }
        >
          Mark all read
        </Button>
      </div>
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
              {!n.is_read && (
                <button
                  type="button"
                  className="shrink-0 text-xs text-primary hover:underline disabled:opacity-50"
                  disabled={markRead.isPending}
                  onClick={() =>
                    markRead.mutate({ id: n.id }, { onError: (e) => toast.error(e.message) })
                  }
                >
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      </QueryState>
    </div>
  );
}
