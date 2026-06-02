import { toast } from "sonner";
import { useTasksList, useStaffList } from "@/hooks/useModules";
import { useAddTask } from "@/hooks/useModuleMutations";
import { ListPage } from "@/components/common/ListPage";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
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
  return (
    <ListPage
      title="Tasks"
      description="Work items across leads, clients, and matters."
      query={q}
      action={<NewTaskAction />}
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
