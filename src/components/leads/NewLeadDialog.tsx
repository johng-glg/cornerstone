import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCreateLead } from "@/hooks/useCoreCrm";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SOURCES = ["web_form", "referral", "phone", "advertisement", "walk_in", "other"] as const;
const INTERESTS = ["debt_resolution", "litigation", "both"] as const;

const labelize = (v: string) => v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const schema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  source: z.enum(SOURCES),
  interest_type: z.enum(INTERESTS),
  estimated_debt_amount: z
    .union([z.coerce.number().nonnegative("Must be 0 or more"), z.nan()])
    .optional(),
  state: z.string().trim().max(2, "Use the 2-letter state code").optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

type FormValues = z.input<typeof schema>;

export function NewLeadDialog() {
  const { staff } = useAuth();
  const createLead = useCreateLead(staff?.company_id);
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
    defaultValues: { source: "web_form", interest_type: "debt_resolution" },
  });

  const onSubmit = handleSubmit((values) => {
    const amount =
      values.estimated_debt_amount === undefined ||
      Number.isNaN(values.estimated_debt_amount as number)
        ? null
        : Number(values.estimated_debt_amount);
    createLead.mutate(
      {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email || null,
        phone: values.phone || null,
        source: values.source,
        interest_type: values.interest_type,
        estimated_debt_amount: amount,
        state: values.state ? values.state.toUpperCase() : null,
        notes: values.notes || null,
      },
      {
        onSuccess: (lead) => {
          toast.success(`Lead ${lead.lead_number} created.`);
          reset();
          setOpen(false);
        },
        onError: (err) => toast.error(err.message),
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
        <Button size="sm">New lead</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>
            Add a prospect. A lead number and score are assigned automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" {...register("first_name")} />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" {...register("last_name")} />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Source</Label>
              <Select
                value={watch("source")}
                onValueChange={(v) => setValue("source", v as (typeof SOURCES)[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {labelize(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Interest</Label>
              <Select
                value={watch("interest_type")}
                onValueChange={(v) => setValue("interest_type", v as (typeof INTERESTS)[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERESTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {labelize(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="estimated_debt_amount">Est. debt ($)</Label>
              <Input
                id="estimated_debt_amount"
                type="number"
                min="0"
                step="100"
                {...register("estimated_debt_amount")}
              />
              {errors.estimated_debt_amount && (
                <p className="text-xs text-destructive">{errors.estimated_debt_amount.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="state">State</Label>
              <Input id="state" maxLength={2} placeholder="CA" {...register("state")} />
              {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending ? "Creating…" : "Create lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
