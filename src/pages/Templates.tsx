import { useState } from "react";
import { toast } from "sonner";
import { useTemplates } from "@/hooks/useDomains";
import { useAddTemplate, useUpdateTemplate } from "@/hooks/useModuleMutations";
import type { TemplateListRow } from "@/lib/db-types";
import { QueryState } from "@/components/common/QueryState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { titleCase } from "@/lib/format";

const TYPES = ["email", "sms", "document"];

function NewTemplateAction() {
  const add = useAddTemplate();
  return (
    <QuickFormDialog
      trigger={<Button size="sm">New template</Button>}
      title="New template"
      pending={add.isPending}
      fields={[
        { name: "name", label: "Name", required: true, full: true },
        {
          name: "template_type",
          label: "Type",
          type: "select",
          required: true,
          defaultValue: "email",
          options: TYPES.map((v) => ({ value: v, label: titleCase(v) })),
        },
        {
          name: "language",
          label: "Language",
          type: "select",
          defaultValue: "en",
          options: [
            { value: "en", label: "English" },
            { value: "es", label: "Spanish" },
          ],
        },
        { name: "content", label: "Content", type: "textarea", required: true },
      ]}
      onSubmit={async (v) => {
        try {
          await add.mutateAsync({
            name: v.name,
            template_type: v.template_type,
            language: v.language,
            content: v.content,
          });
          toast.success("Template created.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

function EditTemplateDialog({
  t,
  open,
  onOpenChange,
}: {
  t: TemplateListRow;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const update = useUpdateTemplate();
  const [name, setName] = useState(t.name);
  const [content, setContent] = useState("");
  const [active, setActive] = useState(t.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit template</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Content</Label>
            <Textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Leave blank to keep existing content"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active
          </label>
        </div>
        <DialogFooter>
          <Button
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                { id: t.id, name, is_active: active, ...(content.trim() ? { content } : {}) },
                {
                  onSuccess: () => {
                    toast.success("Template updated.");
                    onOpenChange(false);
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Templates() {
  const { data, isLoading, error } = useTemplates();
  const rows = data ?? [];
  const [editing, setEditing] = useState<TemplateListRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Templates</h1>
        <NewTemplateAction />
      </div>
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="No templates yet."
      >
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Language</th>
                <th className="px-3 py-2 font-medium">Version</th>
                <th className="px-3 py-2 font-medium">Active</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{t.name}</td>
                  <td className="px-3 py-2">{titleCase(t.template_type)}</td>
                  <td className="px-3 py-2 uppercase text-muted-foreground">{t.language}</td>
                  <td className="px-3 py-2">v{t.current_version}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={t.is_active ? "active" : "inactive"} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-xs text-guardian-gold hover:underline"
                      onClick={() => setEditing(t)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
      {editing && (
        <EditTemplateDialog
          t={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}
