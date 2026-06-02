import { useState, type ReactNode } from "react";
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

export interface Field {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "email" | "textarea" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  full?: boolean;
}

/**
 * Lightweight config-driven form-in-a-dialog. `onSubmit` receives the field values; throw to
 * keep the dialog open (the caller surfaces the error via toast), resolve to close + reset.
 */
export function QuickFormDialog({
  trigger,
  title,
  description,
  fields,
  submitLabel = "Save",
  pending,
  onSubmit,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  fields: Field[];
  submitLabel?: string;
  pending?: boolean;
  onSubmit: (values: Record<string, string>) => Promise<void> | void;
}) {
  const initial = () =>
    Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? ""])) as Record<string, string>;
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [error, setError] = useState<string | null>(null);

  const set = (name: string, v: string) => setValues((s) => ({ ...s, [name]: v }));

  const submit = async () => {
    for (const f of fields) {
      if (f.required && !values[f.name]?.trim()) {
        setError(`${f.label} is required`);
        return;
      }
    }
    setError(null);
    try {
      await onSubmit(values);
      setValues(initial());
      setOpen(false);
    } catch {
      /* caller toasts; keep open */
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setValues(initial());
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div
              key={f.name}
              className={`space-y-1 ${f.full || f.type === "textarea" ? "col-span-2" : ""}`}
            >
              <Label htmlFor={f.name}>{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  id={f.name}
                  rows={3}
                  value={values[f.name]}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              ) : f.type === "select" ? (
                <Select value={values[f.name]} onValueChange={(v) => set(f.name, v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={f.placeholder ?? "Select"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(f.options ?? []).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={f.name}
                  type={f.type ?? "text"}
                  placeholder={f.placeholder}
                  value={values[f.name]}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
