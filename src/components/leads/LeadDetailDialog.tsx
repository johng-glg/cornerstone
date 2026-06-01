import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useUpdateLead } from "@/hooks/useCoreCrm";
import type { LeadDetailRow, LeadListRow } from "@/lib/db-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
const EMPLOYMENT = ["", "employed", "unemployed", "self_employed", "retired", "disabled"] as const;
const labelize = (v: string) => v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const numOrNan = z.union([z.coerce.number().nonnegative(), z.nan()]).optional();

const schema = z.object({
  first_name: z.string().trim().min(1, "Required"),
  last_name: z.string().trim().min(1, "Required"),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  status: z.enum(STATUSES),
  state: z.string().trim().max(2, "2-letter code").optional().or(z.literal("")),
  estimated_debt_amount: numOrNan,
  number_of_debts: numOrNan,
  monthly_income: numOrNan,
  employment_status: z.enum(EMPLOYMENT),
  has_active_lawsuit: z.boolean(),
  in_bankruptcy: z.boolean(),
  notes: z.string().trim().optional().or(z.literal("")),
});

type FormValues = z.input<typeof schema>;

const toNum = (v: number | undefined) =>
  v === undefined || Number.isNaN(v as number) ? null : Number(v);

export function LeadDetailDialog({
  lead,
  open,
  onOpenChange,
}: {
  // Accepts the list row or the fuller detail row.
  lead: LeadListRow | LeadDetailRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateLead = useUpdateLead();
  const detail = lead as LeadDetailRow | null;
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

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
        state: detail?.state ?? "",
        estimated_debt_amount: lead.estimated_debt_amount ?? undefined,
        number_of_debts: detail?.number_of_debts ?? undefined,
        monthly_income: detail?.monthly_income ?? undefined,
        employment_status: (detail?.employment_status ?? "") as (typeof EMPLOYMENT)[number],
        has_active_lawsuit: detail?.has_active_lawsuit ?? false,
        in_bankruptcy: detail?.in_bankruptcy ?? false,
        notes: detail?.notes ?? "",
      });
    }
    // detail fields are derived from `lead`; depending on `lead` is sufficient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead, reset]);

  if (!lead) return null;

  const onSubmit = handleSubmit((values) => {
    updateLead.mutate(
      {
        id: lead.id,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email || null,
        phone: values.phone || null,
        status: values.status,
        state: values.state ? values.state.toUpperCase() : null,
        estimated_debt_amount: toNum(values.estimated_debt_amount),
        number_of_debts: toNum(values.number_of_debts),
        monthly_income: toNum(values.monthly_income),
        employment_status: values.employment_status || null,
        has_active_lawsuit: values.has_active_lawsuit,
        in_bankruptcy: values.in_bankruptcy,
        notes: values.notes || null,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
          <DialogDescription>{lead.lead_number}</DialogDescription>
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

          <div className="grid grid-cols-3 gap-3">
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
              <Label htmlFor="l_state">State</Label>
              <Input id="l_state" maxLength={2} placeholder="CA" {...register("state")} />
              {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Employment</Label>
              <Select
                value={watch("employment_status")}
                onValueChange={(v) =>
                  setValue("employment_status", v as (typeof EMPLOYMENT)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT.map((e) => (
                    <SelectItem key={e || "none"} value={e}>
                      {e ? labelize(e) : "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
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
            <div className="space-y-1">
              <Label htmlFor="l_ndebts"># Debts</Label>
              <Input
                id="l_ndebts"
                type="number"
                min="0"
                step="1"
                {...register("number_of_debts")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="l_income">Monthly income ($)</Label>
              <Input
                id="l_income"
                type="number"
                min="0"
                step="100"
                {...register("monthly_income")}
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                {...register("has_active_lawsuit")}
              />
              Active lawsuit
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                {...register("in_bankruptcy")}
              />
              In bankruptcy
            </label>
          </div>

          <div className="space-y-1">
            <Label htmlFor="l_notes">Notes</Label>
            <Textarea id="l_notes" rows={3} {...register("notes")} />
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
