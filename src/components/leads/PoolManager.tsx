import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  useAssignmentPool,
  useAddPoolMember,
  useRemovePoolMember,
  useTogglePoolMember,
} from "@/hooks/useAssignmentPool";
import { useStaffList } from "@/hooks/useModules";
import { QueryState } from "@/components/common/QueryState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

/**
 * Manage the candidate staff pool for one lead-assignment rule. The assignment engine routes
 * matching new leads to members of this pool by the rule's method (round-robin / weighted /
 * backlog / skillset); a rule with no pool members never assigns.
 */
export function PoolManager({ ruleId, ruleName }: { ruleId: string; ruleName: string }) {
  const [open, setOpen] = useState(false);
  const pool = useAssignmentPool(open ? ruleId : undefined);
  const staff = useStaffList();
  const add = useAddPoolMember(ruleId);
  const remove = useRemovePoolMember(ruleId);
  const toggle = useTogglePoolMember(ruleId);

  const [staffId, setStaffId] = useState("");
  const [weight, setWeight] = useState("10");
  const [maxActive, setMaxActive] = useState("25");

  const members = pool.data ?? [];
  const inPool = new Set(members.map((m) => m.staff_id));
  const available = (staff.data ?? []).filter((s) => !inPool.has(s.id));

  const addMember = () => {
    if (!staffId) {
      toast.error("Pick a staff member.");
      return;
    }
    add.mutate(
      {
        staff_id: staffId,
        weight: Number(weight) || 10,
        max_active_leads: maxActive ? Number(maxActive) : null,
      },
      {
        onSuccess: () => {
          toast.success("Added to pool.");
          setStaffId("");
          setWeight("10");
          setMaxActive("25");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs">
          Pool
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assignment pool — {ruleName}</DialogTitle>
          <DialogDescription>
            Reps eligible for this rule. New matching leads route here by the rule&apos;s method.
          </DialogDescription>
        </DialogHeader>

        <QueryState
          isLoading={pool.isLoading}
          error={pool.error}
          isEmpty={members.length === 0}
          emptyMessage="No reps in this pool yet — add one below so the rule can assign."
        >
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Rep</th>
                  <th className="px-3 py-2 font-medium">Weight</th>
                  <th className="px-3 py-2 font-medium">Max</th>
                  <th className="px-3 py-2 font-medium">Assigned</th>
                  <th className="px-3 py-2 font-medium">Available</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      {m.staff ? `${m.staff.first_name} ${m.staff.last_name}` : "—"}
                    </td>
                    <td className="px-3 py-2">{m.weight}</td>
                    <td className="px-3 py-2">{m.max_active_leads ?? "—"}</td>
                    <td className="px-3 py-2">{m.assignment_count}</td>
                    <td className="px-3 py-2">
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={m.is_available}
                          onChange={(e) =>
                            toggle.mutate(
                              { id: m.id, is_available: e.target.checked },
                              { onError: (err) => toast.error(err.message) },
                            )
                          }
                        />
                        {m.is_available ? "Yes" : "No"}
                      </label>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove from pool"
                        disabled={remove.isPending}
                        onClick={() =>
                          remove.mutate(m.id, {
                            onSuccess: () => toast.success("Removed."),
                            onError: (err) => toast.error(err.message),
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>

        {/* Add a rep */}
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Add a rep</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
            <div className="space-y-1">
              <Label className="text-xs">Staff</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rep" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Weight</Label>
              <Input
                type="number"
                className="w-20"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max active</Label>
              <Input
                type="number"
                className="w-24"
                value={maxActive}
                onChange={(e) => setMaxActive(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" disabled={add.isPending || !staffId} onClick={addMember}>
              {add.isPending ? "Adding…" : "Add to pool"}
            </Button>
          </div>
          {available.length === 0 && (staff.data ?? []).length > 0 && (
            <p className="text-xs text-muted-foreground">All staff are already in this pool.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
