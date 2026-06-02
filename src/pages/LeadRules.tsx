import { toast } from "sonner";
import { useAssignmentRules } from "@/hooks/useModules";
import { useToggleAssignmentRule } from "@/hooks/useModuleMutations";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/format";

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
        { header: "Actions", cell: (r) => <ToggleRule id={r.id} active={r.is_active} /> },
      ]}
    />
  );
}
