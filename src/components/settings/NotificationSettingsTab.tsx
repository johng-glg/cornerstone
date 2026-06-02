import { toast } from "sonner";
import {
  NOTIFICATION_TYPES,
  useNotificationPrefs,
  useUpsertNotificationPref,
  type NotificationPref,
} from "@/hooks/useSettings";
import { QueryState } from "@/components/common/QueryState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { titleCase } from "@/lib/format";

export function NotificationSettingsTab() {
  const q = useNotificationPrefs();
  const upsert = useUpsertNotificationPref();

  // Default: in-app on, email off, when no row exists yet.
  const byType = new Map((q.data ?? []).map((p) => [p.notification_type, p]));
  const prefFor = (type: string): NotificationPref =>
    byType.get(type) ?? { notification_type: type, in_app_enabled: true, email_enabled: false };

  const toggle = (type: string, field: "in_app_enabled" | "email_enabled", value: boolean) => {
    const next = { ...prefFor(type), [field]: value };
    upsert.mutate(next, { onError: (e) => toast.error(e.message) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Notifications</CardTitle>
        <CardDescription>Choose how you're notified for each event type.</CardDescription>
      </CardHeader>
      <CardContent>
        <QueryState isLoading={q.isLoading} error={q.error} isEmpty={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Event</th>
                  <th className="py-2 text-center font-medium">In-app</th>
                  <th className="py-2 text-center font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {NOTIFICATION_TYPES.map((type) => {
                  const p = prefFor(type);
                  return (
                    <tr key={type} className="border-b last:border-0">
                      <td className="py-2">{titleCase(type)}</td>
                      <td className="py-2 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={p.in_app_enabled}
                          disabled={upsert.isPending}
                          onChange={(e) => toggle(type, "in_app_enabled", e.target.checked)}
                        />
                      </td>
                      <td className="py-2 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={p.email_enabled}
                          disabled={upsert.isPending}
                          onChange={(e) => toggle(type, "email_enabled", e.target.checked)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </QueryState>
      </CardContent>
    </Card>
  );
}
