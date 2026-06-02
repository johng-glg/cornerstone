import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useEntityTasks, useAddTask, useToggleTask } from "@/hooks/useLeadTabs";
import { QueryState } from "@/components/common/QueryState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, titleCase } from "@/lib/format";

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export function TasksTab({
  entityId,
  entityType = "lead",
}: {
  entityId: string;
  entityType?: string;
}) {
  const { staff } = useAuth();
  const tasks = useEntityTasks(entityType, entityId);
  const addTask = useAddTask(entityType, entityId, staff?.company_id, staff?.id);
  const toggle = useToggleTask(entityType, entityId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("medium");
  const [dueDate, setDueDate] = useState("");

  const rows = tasks.data ?? [];

  const create = () => {
    if (!title.trim()) return;
    addTask.mutate(
      { title: title.trim(), priority, due_date: dueDate || null },
      {
        onSuccess: () => {
          toast.success("Task added.");
          setTitle("");
          setDueDate("");
          setPriority("medium");
          setOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{rows.length} tasks</span>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Add task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add task</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as (typeof PRIORITIES)[number])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {titleCase(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={addTask.isPending || !title.trim()}>
                {addTask.isPending ? "Adding…" : "Add task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <QueryState
        isLoading={tasks.isLoading}
        error={tasks.error}
        isEmpty={rows.length === 0}
        emptyMessage="No tasks linked to this lead."
      >
        <ul className="space-y-2">
          {rows.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-md border p-3">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={t.status === "completed"}
                onChange={(e) =>
                  toggle.mutate(
                    { id: t.id, completed: e.target.checked },
                    { onError: (err) => toast.error(err.message) },
                  )
                }
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${t.status === "completed" ? "text-muted-foreground line-through" : "font-medium"}`}
                >
                  {t.title}
                </p>
                {t.due_date && (
                  <p className="text-xs text-muted-foreground">Due {formatDate(t.due_date)}</p>
                )}
              </div>
              <StatusBadge status={t.priority} />
            </li>
          ))}
        </ul>
      </QueryState>
    </div>
  );
}
