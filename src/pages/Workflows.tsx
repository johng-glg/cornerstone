import { toast } from "sonner";
import { useWorkflowRules, useToggleWorkflowRule, type WorkflowRule } from "@/hooks/useWorkflows";
import { WorkflowRuleEditor } from "@/components/workflows/WorkflowRuleEditor";
import { ListPage } from "@/components/common/ListPage";
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

export default function Workflows() {
  const q = useWorkflowRules();
  return (
    <ListPage
      title="Workflows"
      description="Automation rules: when a trigger fires on an entity, run an action."
      query={q}
      action={<WorkflowRuleEditor />}
      searchText={(r) => `${r.name} ${r.entity_type} ${r.trigger_type}`}
      exportRow={(r) => ({
        Name: r.name,
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
