import { useState } from "react";
import { toast } from "sonner";
import { useTasksList, useStaffList } from "@/hooks/useModules";
import { useAddTask } from "@/hooks/useModuleMutations";
import { ListPage } from "@/components/common/ListPage";
import { QueryState } from "@/components/common/QueryState";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { Button } from "@/components/ui/button";
import { formatDate, titleCase } from "@/lib/format";

const TASK_TYPES = [
  "follow_up",
  "document_review",
  "court_deadline",
  "settlement_negotiation",
  "client_call",
  "general",
];
const PRIORITIES = ["low", "medium", "high", "urgent"];

function NewTaskAction() {
  const add = useAddTask();
  const staff = useStaffList();
  return (
    <QuickFormDialog
      trigger={<Button size="sm">New task</Button>}
      title="New task"
      pending={add.isPending}
      fields={[
        { name: "title", label: "Title", required: true, full: true },
        {
          name: "task_type",
          label: "Type",
          type: "select",
          defaultValue: "general",
          options: TASK_TYPES.map((t) => ({ value: t, label: titleCase(t) })),
        },
        {
          name: "priority",
          label: "Priority",
          type: "select",
          defaultValue: "medium",
          options: PRIORITIES.map((p) => ({ value: p, label: titleCase(p) })),
        },
        {
          name: "assigned_to",
          label: "Assign to",
          type: "select",
          options: [
            { value: "", label: "Unassigned" },
            ...(staff.data ?? []).map((s) => ({
              value: s.id,
              label: `${s.first_name} ${s.last_name}`,
            })),
          ],
        },
        { name: "due_date", label: "Due date", type: "date" },
      ]}
      onSubmit={async (v) => {
        try {
          await add.mutateAsync({
            title: v.title,
            task_type: v.task_type || "general",
            priority: v.priority || "medium",
            assigned_to: v.assigned_to || null,
            due_date: v.due_date || null,
          });
          toast.success("Task created.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

export default function Tasks() {
  const q = useTasksList();
  const [view, setView] = useState<"list" | "board">("list");

  const toggle = (
    <div className="flex overflow-hidden rounded-md border text-sm">
      <button
        className={`px-3 py-1.5 ${view === "list" ? "bg-guardian-navy text-white" : "text-muted-foreground"}`}
        onClick={() => setView("list")}
      >
        List
      </button>
      <button
        className={`px-3 py-1.5 ${view === "board" ? "bg-guardian-navy text-white" : "text-muted-foreground"}`}
        onClick={() => setView("board")}
      >
        Board
      </button>
    </div>
  );
  const actions = (
    <>
      {toggle}
      <NewTaskAction />
    </>
  );

  if (view === "board") {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Tasks</h1>
            <p className="text-sm text-muted-foreground">Drag a card to change its status.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </div>
        <QueryState
          isLoading={q.isLoading}
          error={q.error}
          isEmpty={(q.data ?? []).length === 0}
          emptyMessage="No tasks yet."
        >
          <TaskKanban tasks={q.data ?? []} />
        </QueryState>
      </div>
    );
  }

  return (
    <ListPage
      title="Tasks"
      description="Work items across leads, clients, and matters."
      query={q}
      action={actions}
      searchText={(t) => `${t.title} ${t.task_type} ${t.status} ${t.priority}`}
      exportRow={(t) => ({
        Title: t.title,
        Type: titleCase(t.task_type),
        "Linked to": t.entity_type ? titleCase(t.entity_type) : "",
        Priority: titleCase(t.priority),
        Status: titleCase(t.status),
        Due: t.due_date ?? "",
      })}
      empty="No tasks yet."
      columns={[
        { header: "Title", cell: (t) => t.title },
        { header: "Type", cell: (t) => titleCase(t.task_type) },
        { header: "Linked to", cell: (t) => (t.entity_type ? titleCase(t.entity_type) : "—") },
        { header: "Priority", cell: (t) => <StatusBadge status={t.priority} /> },
        { header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
        { header: "Due", cell: (t) => formatDate(t.due_date) },
      ]}
    />
  );
}
