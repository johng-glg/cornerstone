import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, X } from "lucide-react";
import { useLitigationTeams, useStaffList } from "@/hooks/useModules";
import { useAddTeam } from "@/hooks/useModuleMutations";
import { useTeamMembers, useAddTeamMember, useRemoveTeamMember } from "@/hooks/useAssignments";
import { ListPage } from "@/components/common/ListPage";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function ManageMembers({ teamId, teamName }: { teamId: string; teamName: string }) {
  const members = useTeamMembers(teamId);
  const addMember = useAddTeamMember(teamId);
  const removeMember = useRemoveTeamMember(teamId);
  const staff = useStaffList();
  const [pick, setPick] = useState("");

  const memberIds = new Set((members.data ?? []).map((m) => m.staff_id));
  const available = (staff.data ?? []).filter((s) => !memberIds.has(s.id));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7">
          Members
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{teamName} — members</DialogTitle>
        </DialogHeader>
        <ul className="space-y-2">
          {(members.data ?? []).map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-md border p-2"
            >
              <span className="text-sm">
                {m.staff ? `${m.staff.first_name} ${m.staff.last_name}` : "—"}
              </span>
              <button
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove"
                disabled={removeMember.isPending}
                onClick={() =>
                  removeMember.mutate(m.id, {
                    onSuccess: () => toast.success("Removed."),
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
          {(members.data ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">No members yet.</li>
          )}
        </ul>
        <div className="flex items-center gap-2 pt-2">
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add a staff member" />
            </SelectTrigger>
            <SelectContent>
              {available.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!pick || addMember.isPending}
            onClick={() =>
              addMember.mutate(
                { staff_id: pick },
                {
                  onSuccess: () => {
                    toast.success("Added.");
                    setPick("");
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
          { header: "", cell: (t) => <ManageMembers teamId={t.id} teamName={t.name} /> },
        ]}
      />
    </div>
  );
}
