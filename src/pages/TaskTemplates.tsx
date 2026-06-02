import { toast } from "sonner";
import { useTaskTemplates } from "@/hooks/useModules";
import { useAddTaskTemplate, useAddTask } from "@/hooks/useModuleMutations";
import { ListPage } from "@/components/common/ListPage";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/format";

const TASK_TYPES = [
  "follow_up",
  "document_review",
  "court_deadline",
  "settlement_negotiation",
  "client_call",
  "general",
];
const PRIORITIES = ["low", "medium", "high", "urgent"];

function NewTemplateAction() {
  const add = useAddTaskTemplate();
  return (
    <QuickFormDialog
      trigger={<Button size="sm">New template</Button>}
      title="New task template"
      pending={add.isPending}
      fields={[
        { name: "name", label: "Template name", required: true, full: true },
        { name: "default_title", label: "Default task title", required: true, full: true },
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
        { name: "default_due_days", label: "Due in (days)", type: "number" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      onSubmit={async (v) => {
        try {
          await add.mutateAsync({
            name: v.name,
            default_title: v.default_title,
            task_type: v.task_type || "general",
            priority: v.priority || "medium",
            default_due_days: v.default_due_days ? Number(v.default_due_days) : null,
            description: v.description || null,
          });
          toast.success("Template created.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

function UseTemplate({
  title,
  taskType,
  priority,
  dueDays,
}: {
  title: string;
  taskType: string;
  priority: string;
  dueDays: number | null;
}) {
  const add = useAddTask();
  const run = () => {
    const due =
      dueDays != null ? new Date(Date.now() + dueDays * 86400000).toISOString().slice(0, 10) : null;
    add.mutate(
      { title, task_type: taskType, priority, due_date: due },
      {
        onSuccess: () => toast.success("Task created from template."),
        onError: (e) => toast.error(e.message),
      },
    );
  };
  return (
    <Button size="sm" variant="outline" className="h-7" disabled={add.isPending} onClick={run}>
      Use
    </Button>
  );
}

export default function TaskTemplates() {
  const q = useTaskTemplates();
  return (
    <ListPage
      title="Task Templates"
      description="Reusable task definitions. 'Use' spawns a task from the template."
      query={q}
      action={<NewTemplateAction />}
      empty="No task templates yet."
      columns={[
        { header: "Name", cell: (t) => t.name },
        { header: "Task title", cell: (t) => t.default_title },
        { header: "Type", cell: (t) => titleCase(t.task_type) },
        { header: "Priority", cell: (t) => <StatusBadge status={t.priority} /> },
        { header: "Due (days)", cell: (t) => t.default_due_days ?? "—" },
        {
          header: "",
          cell: (t) => (
            <UseTemplate
              title={t.default_title}
              taskType={t.task_type}
              priority={t.priority}
              dueDays={t.default_due_days}
            />
          ),
        },
      ]}
    />
  );
}
