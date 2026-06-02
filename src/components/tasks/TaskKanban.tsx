import { useState, type DragEvent } from "react";
import { toast } from "sonner";
import { useUpdateTaskStatus } from "@/hooks/useModuleMutations";
import type { TaskListRow } from "@/hooks/useModules";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate, titleCase } from "@/lib/format";

const COLUMNS = ["pending", "in_progress", "completed", "cancelled"];

/** Drag-and-drop task board (native HTML5 DnD — no deps). Dropping a card sets its status. */
export function TaskKanban({ tasks }: { tasks: TaskListRow[] }) {
  const update = useUpdateTaskStatus();
  const [over, setOver] = useState<string | null>(null);

  const onDrop = (status: string) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === id);
    if (id && task && task.status !== status) {
      update.mutate({ id, status }, { onError: (err) => toast.error(err.message) });
    }
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col);
        return (
          <div
            key={col}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(col);
            }}
            onDragLeave={() => setOver((o) => (o === col ? null : o))}
            onDrop={onDrop(col)}
            className={`min-h-40 rounded-md border bg-muted/30 p-2 transition-colors ${
              over === col ? "border-guardian-gold bg-guardian-gold/10" : ""
            }`}
          >
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {titleCase(col)} ({items.length})
            </p>
            <div className="space-y-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                  className="cursor-grab rounded-md border bg-background p-2 shadow-sm active:cursor-grabbing"
                >
                  <p className="text-sm font-medium">{t.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <StatusBadge status={t.priority} />
                    <span>{titleCase(t.task_type)}</span>
                    {t.due_date && <span>· {formatDate(t.due_date)}</span>}
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">Drop here</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
