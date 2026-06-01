import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useUpdateLead } from "@/hooks/useCoreCrm";
import type { LeadListRow } from "@/lib/db-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = ["new", "contacted", "qualified", "converted", "lost"] as const;
const labelize = (v: string) => v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const schema = z.object({
  first_name: z.string().trim().min(1, "Required"),
  last_name: z.string().trim().min(1, "Required"),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  status: z.enum(STATUSES),
  estimated_debt_amount: z.union([z.coerce.number().nonnegative(), z.nan()]).optional(),
});

type FormValues = z.input<typeof schema>;

export function LeadDetailDialog({
  lead,
  open,
  onOpenChange,
}: {
  lead: LeadListRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateLead = useUpdateLead();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Re-seed the form whenever a different lead is opened.
  useEffect(() => {
    if (lead) {
      reset({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        status: STATUSES.includes(lead.status as (typeof STATUSES)[number])
          ? (lead.status as (typeof STATUSES)[number])
          : "new",
        estimated_debt_amount: lead.estimated_debt_amount ?? undefined,
      });
    }
  }, [lead, reset]);

  if (!lead) return null;

  const onSubmit = handleSubmit((values) => {
    const amount =
      values.estimated_debt_amount === undefined ||
      Number.isNaN(values.estimated_debt_amount as number)
        ? null
        : Number(values.estimated_debt_amount);
    updateLead.mutate(
      {
        id: lead.id,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email || null,
        phone: values.phone || null,
        status: values.status,
        estimated_debt_amount: amount,
      },
      {
        onSuccess: () => {
          toast.success("Lead updated.");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lead.lead_number}</DialogTitle>
          <DialogDescription>
            Score {lead.lead_score ?? "—"} · {labelize(lead.source)} ·{" "}
            {labelize(lead.interest_type)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="l_first">First name</Label>
              <Input id="l_first" {...register("first_name")} />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="l_last">Last name</Label>
              <Input id="l_last" {...register("last_name")} />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="l_email">Email</Label>
              <Input id="l_email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="l_phone">Phone</Label>
              <Input id="l_phone" {...register("phone")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as (typeof STATUSES)[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {labelize(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="l_debt">Est. debt ($)</Label>
              <Input
                id="l_debt"
                type="number"
                min="0"
                step="100"
                {...register("estimated_debt_amount")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={updateLead.isPending}>
              {updateLead.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
