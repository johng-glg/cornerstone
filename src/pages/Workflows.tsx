import { toast } from "sonner";
import {
  useWorkflowRules,
  useSaveWorkflowRule,
  useToggleWorkflowRule,
  WORKFLOW_ENTITIES,
  WORKFLOW_TRIGGERS,
  WORKFLOW_ACTIONS,
  type WorkflowRule,
} from "@/hooks/useWorkflows";
import { ListPage } from "@/components/common/ListPage";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/format";

const ACTIVE_OPTS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];
const YESNO = [
  { value: "false", label: "No" },
  { value: "true", label: "Yes" },
];
const sel = (vals: string[]) => vals.map((v) => ({ value: v, label: titleCase(v) }));

function RuleDialog({ rule }: { rule?: WorkflowRule }) {
  const save = useSaveWorkflowRule();
  const editing = !!rule;
  const currentAction = rule?.actions?.[0]?.type ?? "create_task";
  return (
    <QuickFormDialog
      trigger={
        <Button
          size="sm"
          variant={editing ? "ghost" : "default"}
          className={editing ? "h-7 text-xs" : ""}
        >
          {editing ? "Edit" : "New rule"}
        </Button>
      }
      title={editing ? "Edit workflow rule" : "New workflow rule"}
      description="When the trigger fires on the entity, the action runs."
      pending={save.isPending}
      fields={[
        { name: "name", label: "Name", required: true, full: true, defaultValue: rule?.name ?? "" },
        {
          name: "entity_type",
          label: "Entity",
          type: "select",
          required: true,
          options: sel(WORKFLOW_ENTITIES),
          defaultValue: rule?.entity_type ?? "leads",
        },
        {
          name: "trigger_type",
          label: "Trigger",
          type: "select",
          required: true,
          options: sel(WORKFLOW_TRIGGERS),
          defaultValue: rule?.trigger_type ?? "status_changed",
        },
        {
          name: "action_type",
          label: "Action",
          type: "select",
          required: true,
          options: sel(WORKFLOW_ACTIONS),
          defaultValue: currentAction,
        },
        {
          name: "priority",
          label: "Priority",
          type: "number",
          defaultValue: String(rule?.priority ?? 100),
        },
        {
          name: "is_blocking",
          label: "Blocking",
          type: "select",
          options: YESNO,
          defaultValue: rule?.is_blocking ? "true" : "false",
        },
        {
          name: "is_active",
          label: "Status",
          type: "select",
          options: ACTIVE_OPTS,
          defaultValue: rule?.is_active === false ? "false" : "true",
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          defaultValue: rule?.description ?? "",
        },
      ]}
      onSubmit={async (v) => {
        try {
          await save.mutateAsync({
            id: rule?.id ?? null,
            name: v.name,
            description: v.description || null,
            entity_type: v.entity_type,
            trigger_type: v.trigger_type,
            action_type: v.action_type,
            priority: parseInt(v.priority, 10) || 100,
            is_blocking: v.is_blocking === "true",
            is_active: v.is_active === "true",
          });
          toast.success(editing ? "Rule updated." : "Rule created.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

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

export default function Workflows() {
  const q = useWorkflowRules();
  return (
    <ListPage
      title="Workflows"
      description="Automation rules: when a trigger fires on an entity, run an action."
      query={q}
      action={<RuleDialog />}
      searchText={(r) => `${r.name} ${r.entity_type} ${r.trigger_type}`}
      empty="No workflow rules yet."
      columns={[
        { header: "Name", cell: (r) => r.name },
        { header: "Entity", cell: (r) => titleCase(r.entity_type) },
        { header: "Trigger", cell: (r) => titleCase(r.trigger_type) },
        { header: "Action", cell: (r) => titleCase(r.actions?.[0]?.type ?? "—") },
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
              <RuleDialog rule={r} />
              <ToggleRule rule={r} />
            </span>
          ),
        },
      ]}
    />
  );
}
