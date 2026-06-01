import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAddLeadDebt } from "@/hooks/useLeadDetail";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPES = [
  "credit_card",
  "medical",
  "auto_loan",
  "personal_loan",
  "student_loan",
  "mortgage",
  "other",
] as const;
const labelize = (v: string) => v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const schema = z.object({
  creditor_name: z.string().trim().min(1, "Creditor is required"),
  account_type: z.enum(TYPES),
  original_balance: z.union([z.coerce.number().nonnegative(), z.nan()]).optional(),
  current_balance: z.coerce.number().nonnegative("Enter the current balance"),
  account_number_last4: z
    .string()
    .trim()
    .regex(/^\d{0,4}$/, "Up to 4 digits")
    .optional()
    .or(z.literal("")),
  is_enrolled: z.enum(["yes", "no"]),
});

type FormValues = z.input<typeof schema>;

export function AddDebtDialog({ leadId }: { leadId: string }) {
  const addDebt = useAddLeadDebt();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { account_type: "credit_card", is_enrolled: "yes" },
  });

  const onSubmit = handleSubmit((values) => {
    const original =
      values.original_balance === undefined || Number.isNaN(values.original_balance as number)
        ? null
        : Number(values.original_balance);
    addDebt.mutate(
      {
        lead_id: leadId,
        creditor_name: values.creditor_name,
        account_type: values.account_type,
        original_balance: original,
        current_balance: Number(values.current_balance),
        account_number_last4: values.account_number_last4 || null,
        is_enrolled: values.is_enrolled === "yes",
      },
      {
        onSuccess: () => {
          toast.success("Debt added.");
          reset({ account_type: values.account_type, is_enrolled: "yes" });
          setOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Add debt
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add debt</DialogTitle>
          <DialogDescription>Record a creditor balance for this lead.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="d_creditor">Creditor</Label>
            <Input id="d_creditor" placeholder="e.g. Capital One" {...register("creditor_name")} />
            {errors.creditor_name && (
              <p className="text-xs text-destructive">{errors.creditor_name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={watch("account_type")}
                onValueChange={(v) => setValue("account_type", v as (typeof TYPES)[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {labelize(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Enrolled</Label>
              <Select
                value={watch("is_enrolled")}
                onValueChange={(v) => setValue("is_enrolled", v as "yes" | "no")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="d_current">Current balance ($)</Label>
              <Input
                id="d_current"
                type="number"
                min="0"
                step="0.01"
                {...register("current_balance")}
              />
              {errors.current_balance && (
                <p className="text-xs text-destructive">{errors.current_balance.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="d_original">Original balance ($)</Label>
              <Input
                id="d_original"
                type="number"
                min="0"
                step="0.01"
                {...register("original_balance")}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="d_last4">Account # (last 4)</Label>
            <Input
              id="d_last4"
              maxLength={4}
              placeholder="1234"
              {...register("account_number_last4")}
            />
            {errors.account_number_last4 && (
              <p className="text-xs text-destructive">{errors.account_number_last4.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={addDebt.isPending}>
              {addDebt.isPending ? "Adding…" : "Add debt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
