import { toast } from "sonner";
import {
  useDocusealTemplates,
  useSaveDocusealTemplate,
  type DocusealTemplate,
} from "@/hooks/useSettings";
import { QueryState } from "@/components/common/QueryState";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ACTIVE_OPTS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];
const parseRoles = (s: string): string[] =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function TemplateDialog({ tpl }: { tpl?: DocusealTemplate }) {
  const save = useSaveDocusealTemplate();
  const editing = !!tpl;
  return (
    <QuickFormDialog
      trigger={
        <Button
          size="sm"
          variant={editing ? "ghost" : "default"}
          className={editing ? "h-7 text-xs" : ""}
        >
          {editing ? "Edit" : "New template"}
        </Button>
      }
      title={editing ? "Edit e-sign template" : "New e-sign template"}
      description="Maps a DocuSeal template (by its numeric ID) for sending signature requests."
      pending={save.isPending}
      fields={[
        { name: "name", label: "Name", required: true, full: true, defaultValue: tpl?.name ?? "" },
        {
          name: "docuseal_template_id",
          label: "DocuSeal template ID (number)",
          type: "number",
          required: true,
          defaultValue: tpl ? String(tpl.docuseal_template_id) : "",
        },
        {
          name: "signer_roles",
          label: "Signer roles (comma-separated)",
          full: true,
          defaultValue: (tpl?.signer_roles ?? []).join(", "),
          placeholder: "client, co-client, attorney",
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          defaultValue: tpl?.description ?? "",
        },
        {
          name: "is_active",
          label: "Status",
          type: "select",
          options: ACTIVE_OPTS,
          defaultValue: tpl?.is_active === false ? "false" : "true",
        },
      ]}
      onSubmit={async (v) => {
        const tid = parseInt(v.docuseal_template_id, 10);
        if (Number.isNaN(tid)) {
          toast.error("DocuSeal template ID must be a number.");
          throw new Error("bad id");
        }
        try {
          await save.mutateAsync({
            id: tpl?.id ?? null,
            name: v.name,
            docuseal_template_id: tid,
            description: v.description || null,
            signer_roles: parseRoles(v.signer_roles),
            is_active: v.is_active === "true",
          });
          toast.success(editing ? "Template updated." : "Template created.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

export function EsignTemplatesSettingsTab() {
  const q = useDocusealTemplates();
  const rows = q.data ?? [];
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">E-sign templates</CardTitle>
          <CardDescription>
            DocuSeal document templates used for signature requests.
          </CardDescription>
        </div>
        <TemplateDialog />
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={q.isLoading}
          error={q.error}
          isEmpty={rows.length === 0}
          emptyMessage="No e-sign templates yet."
        >
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">DocuSeal ID</th>
                  <th className="px-3 py-2 font-medium">Signers</th>
                  <th className="px-3 py-2 font-medium">Active</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{t.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{t.docuseal_template_id}</td>
                    <td className="px-3 py-2">{(t.signer_roles ?? []).join(", ") || "—"}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={t.is_active ? "active" : "inactive"} />
                    </td>
                    <td className="px-3 py-2">
                      <TemplateDialog tpl={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </CardContent>
    </Card>
  );
}
