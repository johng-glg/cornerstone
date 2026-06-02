import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useAddLeadActivity } from "@/hooks/useLeadDetail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ACTIVITY_TYPES = ["call", "email", "sms", "meeting", "note", "other"] as const;
const labelize = (v: string) => v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const schema = z.object({
  activity_type: z.enum(ACTIVITY_TYPES),
  outcome: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().min(1, "Add a note"),
  next_action: z.string().trim().optional().or(z.literal("")),
  next_action_date: z.string().trim().optional().or(z.literal("")),
});

type FormValues = z.input<typeof schema>;

export function LogActivityForm({ leadId }: { leadId: string }) {
  const { staff } = useAuth();
  const addActivity = useAddLeadActivity();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { activity_type: "call" },
  });

  const onSubmit = handleSubmit((values) => {
    addActivity.mutate(
      {
        lead_id: leadId,
        staff_id: staff?.id ?? null,
        activity_type: values.activity_type,
        outcome: values.outcome || null,
        notes: values.notes,
        next_action: values.next_action || null,
        next_action_date: values.next_action_date || null,
      },
      {
        onSuccess: () => {
          toast.success("Activity logged.");
          reset({ activity_type: values.activity_type });
        },
        onError: (e) => toast.error(e.message),
      },
    );
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Type</Label>
          <Select
            value={watch("activity_type")}
            onValueChange={(v) => setValue("activity_type", v as (typeof ACTIVITY_TYPES)[number])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {labelize(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="a_outcome">Outcome</Label>
          <Input id="a_outcome" placeholder="e.g. Left voicemail" {...register("outcome")} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="a_notes">Notes</Label>
        <Textarea id="a_notes" rows={2} {...register("notes")} />
        {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="a_next">Next action</Label>
          <Input id="a_next" placeholder="e.g. Follow up" {...register("next_action")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="a_next_date">Next action date</Label>
          <Input id="a_next_date" type="date" {...register("next_action_date")} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={addActivity.isPending}>
          {addActivity.isPending ? "Logging…" : "Log activity"}
        </Button>
      </div>
    </form>
  );
}
