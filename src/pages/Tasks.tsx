import { useTasksList } from "@/hooks/useModules";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate, titleCase } from "@/lib/format";

export default function Tasks() {
  const q = useTasksList();
  return (
    <ListPage
      title="Tasks"
      description="Work items across leads, clients, and matters."
      query={q}
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
