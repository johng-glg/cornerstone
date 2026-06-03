import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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

// Pulls real Forth contacts and loads them as *de-identified* clients + engagements. Two-step by
// design: a dry run (PII-free preview, writes nothing) must succeed before the real import unlocks.
// Edge function: forth-import-anonymized.

interface DryRunResult {
  fetched: number;
  mappable: number;
  already_imported: number;
  would_import: number;
  errors: { id: string; error: string }[];
  previews: { client: { last_name: string; email: string }; service: { status: string } }[];
}
interface ImportResult {
  imported: number;
  already_imported: number;
  records: { service_number: string | null }[];
  errors: { id: string; error: string }[];
}

function parseIds(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}

// supabase.functions.invoke surfaces only a generic message; the useful detail is in the response
// body (FunctionsHttpError.context). Pull our { error } payload out for the toast.
async function fnError(error: { message: string }): Promise<string> {
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = (await ctx.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      /* fall through */
    }
  }
  if (error.message.includes("not found") || error.message.includes("404"))
    return "Function not deployed yet — deploy edge functions first.";
  return error.message;
}

export function ForthImportButton({
  providerKey,
  companyId,
}: {
  providerKey: string;
  companyId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [ids, setIds] = useState("");
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<DryRunResult | null>(null);

  if (!providerKey.includes("forth")) return null;

  const reset = () => {
    setIds("");
    setPreview(null);
    setPending(false);
  };

  const run = async (dry: boolean) => {
    const contact_ids = parseIds(ids);
    if (!companyId) {
      toast.error("No active company on your profile.");
      return;
    }
    if (contact_ids.length === 0) {
      toast.error("Enter at least one Forth contact ID.");
      return;
    }
    setPending(true);
    const { data, error } = await supabase.functions.invoke("forth-import-anonymized", {
      body: { company_id: companyId, contact_ids, dry_run: dry },
    });
    setPending(false);
    if (error) {
      toast.error(await fnError(error));
      return;
    }
    if (data && (data as { success?: boolean }).success === false) {
      toast.error((data as { error?: string }).error ?? "Import failed.");
      return;
    }
    if (dry) {
      const d = data as DryRunResult;
      setPreview(d);
      toast.success(`Preview: ${d.would_import} new, ${d.already_imported} already imported.`);
    } else {
      const d = data as ImportResult;
      toast.success(`Imported ${d.imported} anonymized client(s).`);
      setOpen(false);
      reset();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 text-xs">
          Import (anonymized)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Forth contacts (anonymized)</DialogTitle>
          <DialogDescription>
            Pulls real Forth contacts and loads them as clients + engagements with all PII replaced
            by dummy data. Program structure (debt totals, payment, term, status, dates) is kept.
            Preview first — it writes nothing until you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={ids}
            onChange={(e) => {
              setIds(e.target.value);
              setPreview(null); // re-preview after edits
            }}
            placeholder="Forth contact IDs — comma, space, or newline separated (e.g. 884412, 884510)"
            rows={3}
          />

          {preview && (
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <p className="font-medium">
                {preview.would_import} would import · {preview.already_imported} already imported ·{" "}
                {preview.errors.length} error(s)
              </p>
              {preview.previews.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-muted-foreground">
                  {preview.previews.slice(0, 5).map((p, i) => (
                    <li key={i}>
                      {p.client.last_name} · {p.client.email} · {p.service.status}
                    </li>
                  ))}
                </ul>
              )}
              {preview.errors.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-destructive">
                  {preview.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>
                      {e.id}: {e.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={pending} onClick={() => run(true)}>
            {pending ? "Working…" : "Preview (dry run)"}
          </Button>
          <Button
            disabled={pending || !preview || preview.would_import === 0}
            onClick={() => run(false)}
          >
            {preview ? `Import ${preview.would_import}` : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
