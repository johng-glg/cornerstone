import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useReminderSettings, useSaveReminderSettings } from "@/hooks/useSettings";
import { QueryState } from "@/components/common/QueryState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const parseDays = (s: string): number[] =>
  s
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 0);

export function ReminderSettingsTab() {
  const q = useReminderSettings();
  const save = useSaveReminderSettings();
  const [respDays, setRespDays] = useState("");
  const [hearingDays, setHearingDays] = useState("");
  const [taskDays, setTaskDays] = useState("");
  const [hour, setHour] = useState("8");
  const [active, setActive] = useState(true);

  useEffect(() => {
    const r = q.data;
    if (r) {
      setRespDays((r.response_deadline_days ?? []).join(", "));
      setHearingDays((r.hearing_days ?? []).join(", "));
      setTaskDays((r.task_due_days ?? []).join(", "));
      setHour(String(r.reminder_hour ?? 8));
      setActive(r.is_active ?? true);
    }
  }, [q.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Reminders</CardTitle>
        <CardDescription>
          How many days ahead reminders fire, and the hour of day to send them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <QueryState isLoading={q.isLoading} error={q.error} isEmpty={false}>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="resp">
                Response deadline reminders (days before, comma-separated)
              </Label>
              <Input
                id="resp"
                value={respDays}
                onChange={(e) => setRespDays(e.target.value)}
                placeholder="7, 3, 1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hear">Hearing reminders (days before)</Label>
              <Input
                id="hear"
                value={hearingDays}
                onChange={(e) => setHearingDays(e.target.value)}
                placeholder="7, 1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="task">Task due reminders (days before)</Label>
              <Input
                id="task"
                value={taskDays}
                onChange={(e) => setTaskDays(e.target.value)}
                placeholder="3, 1"
              />
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label htmlFor="hour">Send hour (0–23)</Label>
                <Input
                  id="hour"
                  type="number"
                  className="w-28"
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Reminders enabled
              </label>
            </div>
          </div>
          <Button
            className="mt-4"
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                {
                  id: q.data?.id ?? null,
                  response_deadline_days: parseDays(respDays),
                  hearing_days: parseDays(hearingDays),
                  task_due_days: parseDays(taskDays),
                  reminder_hour: Math.min(23, Math.max(0, parseInt(hour, 10) || 8)),
                  is_active: active,
                },
                {
                  onSuccess: () => toast.success("Reminder settings saved."),
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            {save.isPending ? "Saving…" : "Save reminders"}
          </Button>
        </QueryState>
      </CardContent>
    </Card>
  );
}
