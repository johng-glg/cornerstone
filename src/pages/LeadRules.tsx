import { toast } from "sonner";
import { useAssignmentRules } from "@/hooks/useModules";
import { useToggleAssignmentRule, useCreateAssignmentRule } from "@/hooks/useModuleMutations";
import { ListPage } from "@/components/common/ListPage";
import { PoolManager } from "@/components/leads/PoolManager";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/format";

const METHODS = ["round_robin", "weighted", "backlog_based", "skillset_match"];

function NewRuleAction() {
  const create = useCreateAssignmentRule();
  return (
    <QuickFormDialog
      trigger={<Button size="sm">New rule</Button>}
      title="Create assignment rule"
      description="Active rules are applied by priority to route new leads to staff."
      pending={create.isPending}
      fields={[
        { name: "name", label: "Rule name", required: true, full: true },
        {
          name: "method",
          label: "Method",
          type: "select",
          defaultValue: "round_robin",
          options: METHODS.map((m) => ({ value: m, label: titleCase(m) })),
        },
        { name: "priority", label: "Priority", type: "number", placeholder: "0" },
        { name: "source", label: "Lead source", placeholder: "Any source" },
        { name: "interest_type", label: "Interest type", placeholder: "Any type" },
        { name: "min_debt_amount", label: "Min debt ($)", type: "number" },
        { name: "max_debt_amount", label: "Max debt ($)", type: "number" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      onSubmit={async (v) => {
        try {
          await create.mutateAsync({
            name: v.name,
            method: v.method || "round_robin",
            priority: v.priority ? Number(v.priority) : 0,
            source: v.source || null,
            interest_type: v.interest_type || null,
            min_debt_amount: v.min_debt_amount ? Number(v.min_debt_amount) : null,
            max_debt_amount: v.max_debt_amount ? Number(v.max_debt_amount) : null,
            description: v.description || null,
            is_active: true,
          });
          toast.success("Rule created.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

function ToggleRule({ id, active }: { id: string; active: boolean }) {
  const toggle = useToggleAssignmentRule();
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7"
      disabled={toggle.isPending}
      onClick={() =>
        toggle.mutate(
          { id, is_active: !active },
          {
            onSuccess: () => toast.success(active ? "Disabled." : "Enabled."),
            onError: (e) => toast.error(e.message),
          },
        )
      }
    >
      {active ? "Disable" : "Enable"}
    </Button>
  );
}

export default function LeadRules() {
  const q = useAssignmentRules();
  return (
    <ListPage
      title="Lead Assignment Rules"
      description="How new leads are routed to staff. The assignment engine applies active rules by priority."
      query={q}
      action={<NewRuleAction />}
      empty="No assignment rules configured."
      columns={[
        { header: "Name", cell: (r) => r.name },
        { header: "Method", cell: (r) => titleCase(r.method) },
        { header: "Source", cell: (r) => (r.source ? titleCase(r.source) : "Any") },
        { header: "Interest", cell: (r) => (r.interest_type ? titleCase(r.interest_type) : "Any") },
        { header: "Priority", cell: (r) => r.priority ?? "—" },
        { header: "Default", cell: (r) => (r.is_default ? "Yes" : "—") },
        {
          header: "Active",
          cell: (r) => <StatusBadge status={r.is_active ? "active" : "inactive"} />,
        },
        {
          header: "Actions",
          cell: (r) => (
            <span className="flex gap-1">
              <PoolManager ruleId={r.id} ruleName={r.name} />
              <ToggleRule id={r.id} active={r.is_active} />
            </span>
          ),
        },
      ]}
    />
  );
}
