import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRecordActivity } from "@/hooks/useActivityLog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { titleCase } from "@/lib/format";

/**
 * Editable status control for a record. Updates the row's `status`, records a "status" entry to
 * the unified activity_log (so the change shows in the entity's Activity feed and rolls up to the
 * client), and refetches the affected queries.
 */
export function StatusChanger({
  table,
  id,
  current,
  options,
  entityType,
  entityId,
  clientId,
  invalidateKeys = [],
}: {
  table: string;
  id: string;
  current: string;
  options: string[];
  entityType: string;
  entityId: string;
  clientId?: string | null;
  invalidateKeys?: readonly unknown[][];
}) {
  const qc = useQueryClient();
  const record = useRecordActivity();
  const [pending, setPending] = useState(false);

  // Show the current value even if it isn't in the canonical list (defensive).
  const opts = options.includes(current) ? options : [current, ...options];

  const change = async (next: string) => {
    if (!next || next === current) return;
    setPending(true);
    const { error } = await supabase.from(table).update({ status: next }).eq("id", id);
    if (error) {
      toast.error(error.message);
      setPending(false);
      return;
    }
    await record({
      entityType,
      entityId,
      clientId,
      category: "status",
      description: `Status changed: ${titleCase(current)} → ${titleCase(next)}`,
      metadata: { from: current, to: next },
    });
    invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    toast.success("Status updated.");
    setPending(false);
  };

  return (
    <Select value={current} onValueChange={change} disabled={pending}>
      <SelectTrigger className="h-8 w-48" aria-label="Change status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opts.map((o) => (
          <SelectItem key={o} value={o}>
            {titleCase(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
