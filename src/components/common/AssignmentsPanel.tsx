import { toast } from "sonner";
import { X } from "lucide-react";
import {
  useAssignments,
  useAddAssignment,
  useRemoveAssignment,
  ASSIGNMENT_TYPES,
} from "@/hooks/useAssignments";
import { useStaffList } from "@/hooks/useModules";
import { useRecordActivity } from "@/hooks/useActivityLog";
import { QueryState } from "@/components/common/QueryState";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/format";

/** Reusable "who's assigned" panel for any entity (lead, engagement, liability, matter). */
export function AssignmentsPanel({
  entityType,
  entityId,
  clientId,
}: {
  entityType: string;
  entityId: string;
  /** Owning client, when known, so the assignment also rolls up to the client timeline. */
  clientId?: string | null;
}) {
  const q = useAssignments(entityType, entityId);
  const add = useAddAssignment(entityType, entityId);
  const remove = useRemoveAssignment(entityType, entityId);
  const staff = useStaffList();
  const record = useRecordActivity();
  const rows = q.data ?? [];

  const staffName = (id: string) => {
    const s = (staff.data ?? []).find((x) => x.id === id);
    return s ? `${s.first_name} ${s.last_name}` : "a staff member";
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <QuickFormDialog
          trigger={<Button size="sm">Assign staff</Button>}
          title="Assign staff"
          pending={add.isPending}
          fields={[
            {
              name: "staff_id",
              label: "Staff",
              type: "select",
              required: true,
              options: (staff.data ?? []).map((s) => ({
                value: s.id,
                label: `${s.first_name} ${s.last_name}`,
              })),
            },
            {
              name: "assignment_type",
              label: "Role",
              type: "select",
              required: true,
              options: ASSIGNMENT_TYPES.map((t) => ({ value: t, label: titleCase(t) })),
            },
          ]}
          onSubmit={async (v) => {
            try {
              await add.mutateAsync({ staff_id: v.staff_id, assignment_type: v.assignment_type });
              await record({
                entityType,
                entityId,
                clientId,
                category: "assignment",
                description: `Assigned ${staffName(v.staff_id)} as ${titleCase(v.assignment_type)}`,
                metadata: { staff_id: v.staff_id, assignment_type: v.assignment_type },
              });
              toast.success("Assigned.");
            } catch (e) {
              toast.error((e as Error).message);
              throw e;
            }
          }}
        />
      </div>
      <QueryState
        isLoading={q.isLoading}
        error={q.error}
        isEmpty={rows.length === 0}
        emptyMessage="No one assigned yet."
      >
        <ul className="space-y-2">
          {rows.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {a.staff ? `${a.staff.first_name} ${a.staff.last_name}` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{titleCase(a.assignment_type)}</p>
              </div>
              <button
                className="text-muted-foreground hover:text-destructive"
                aria-label="Unassign"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(a.id, {
                    onSuccess: () => {
                      const name = a.staff
                        ? `${a.staff.first_name} ${a.staff.last_name}`
                        : "a staff member";
                      void record({
                        entityType,
                        entityId,
                        clientId,
                        category: "assignment",
                        description: `Unassigned ${name} (${titleCase(a.assignment_type)})`,
                        metadata: { assignment_id: a.id, assignment_type: a.assignment_type },
                      });
                      toast.success("Unassigned.");
                    },
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </QueryState>
    </div>
  );
}
