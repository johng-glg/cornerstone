import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useLitigationTeams } from "@/hooks/useModules";
import { useAddTeam } from "@/hooks/useModuleMutations";
import { ListPage } from "@/components/common/ListPage";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";

function AddTeamAction() {
  const add = useAddTeam();
  return (
    <QuickFormDialog
      trigger={<Button size="sm">New team</Button>}
      title="New litigation team"
      pending={add.isPending}
      fields={[
        { name: "name", label: "Name", required: true, full: true },
        { name: "description", label: "Description", type: "textarea" },
        { name: "color", label: "Color", placeholder: "#E0B772" },
      ]}
      onSubmit={async (v) => {
        try {
          await add.mutateAsync({ name: v.name, description: v.description, color: v.color });
          toast.success("Team created.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

export default function LitigationTeams() {
  const q = useLitigationTeams();
  return (
    <div className="space-y-4">
      <Link
        to="/litigation"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to litigation
      </Link>
      <ListPage
        title="Litigation Teams"
        description="Groups of staff who handle matters together."
        query={q}
        action={<AddTeamAction />}
        empty="No teams yet."
        columns={[
          {
            header: "Name",
            cell: (t) => (
              <span className="flex items-center gap-2">
                {t.color && (
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                )}
                {t.name}
              </span>
            ),
          },
          { header: "Description", cell: (t) => t.description ?? "—" },
          { header: "Priority", cell: (t) => t.priority ?? "—" },
          {
            header: "Active",
            cell: (t) => <StatusBadge status={t.is_active ? "active" : "inactive"} />,
          },
        ]}
      />
    </div>
  );
}
