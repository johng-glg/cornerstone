import { toast } from "sonner";
import {
  useWorkflowRules,
  useToggleWorkflowRule,
  useWorkflowGroups,
  useCreateWorkflowGroup,
  WORKFLOW_ENTITIES,
  type WorkflowRule,
} from "@/hooks/useWorkflows";
import { WorkflowRuleEditor } from "@/components/workflows/WorkflowRuleEditor";
import { ListPage } from "@/components/common/ListPage";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/format";

function ToggleRule({ rule }: { rule: WorkflowRule }) {
  const toggle = useToggleWorkflowRule();
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs"
      disabled={toggle.isPending}
      onClick={() =>
        toggle.mutate(
          { id: rule.id, is_active: !rule.is_active },
          {
            onSuccess: () => toast.success(rule.is_active ? "Disabled." : "Enabled."),
            onError: (e) => toast.error(e.message),
          },
        )
      }
    >
      {rule.is_active ? "Disable" : "Enable"}
    </Button>
  );
}

function NewGroupAction() {
  const create = useCreateWorkflowGroup();
  return (
    <QuickFormDialog
      trigger={
        <Button size="sm" variant="outline">
          New group
        </Button>
      }
      title="New workflow group"
      description="Group related rules (e.g. by state or matter type), per entity."
      pending={create.isPending}
      fields={[
        { name: "name", label: "Group name", required: true, full: true },
        {
          name: "entity_type",
          label: "Entity",
          type: "select",
          defaultValue: "leads",
          options: WORKFLOW_ENTITIES.map((e) => ({ value: e, label: titleCase(e) })),
        },
        { name: "color", label: "Color (optional)", placeholder: "#1F3A5C" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      onSubmit={async (v) => {
        try {
          await create.mutateAsync({
            name: v.name,
            entity_type: v.entity_type || "leads",
            color: v.color || null,
            description: v.description || null,
          });
          toast.success("Group created.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

export default function Workflows() {
  const q = useWorkflowRules();
  const groups = useWorkflowGroups();
  const groupName = (id: string | null) =>
    id ? ((groups.data ?? []).find((g) => g.id === id)?.name ?? "—") : "—";

  return (
    <ListPage
      title="Workflows"
      description="Automation rules: when a trigger fires on an entity, run an action. Group related rules to organize them."
      query={q}
      action={
        <span className="flex gap-2">
          <NewGroupAction />
          <WorkflowRuleEditor />
        </span>
      }
      searchText={(r) => `${r.name} ${r.entity_type} ${r.trigger_type} ${groupName(r.group_id)}`}
      exportRow={(r) => ({
        Name: r.name,
        Group: groupName(r.group_id),
        Entity: titleCase(r.entity_type),
        Trigger: titleCase(r.trigger_type),
        Actions: (r.actions ?? []).map((a) => a.type).join("; "),
        Conditions: (r.conditions ?? []).length,
        Priority: r.priority,
        Blocking: r.is_blocking ? "Yes" : "No",
        Active: r.is_active ? "Yes" : "No",
      })}
      empty="No workflow rules yet."
      columns={[
        { header: "Name", cell: (r) => r.name },
        { header: "Group", cell: (r) => groupName(r.group_id) },
        { header: "Entity", cell: (r) => titleCase(r.entity_type) },
        { header: "Trigger", cell: (r) => titleCase(r.trigger_type) },
        {
          header: "Actions",
          cell: (r) => (r.actions ?? []).map((a) => titleCase(a.type)).join(", ") || "—",
        },
        { header: "Conditions", cell: (r) => (r.conditions ?? []).length || "—" },
        { header: "Priority", cell: (r) => r.priority },
        { header: "Blocking", cell: (r) => (r.is_blocking ? "Yes" : "—") },
        {
          header: "Active",
          cell: (r) => <StatusBadge status={r.is_active ? "active" : "inactive"} />,
        },
        {
          header: "",
          cell: (r) => (
            <span className="flex gap-1">
              <WorkflowRuleEditor rule={r} />
              <ToggleRule rule={r} />
            </span>
          ),
        },
      ]}
    />
  );
}
