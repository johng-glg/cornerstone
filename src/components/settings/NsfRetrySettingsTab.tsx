import { toast } from "sonner";
import { useNsfPolicies, useSaveNsfPolicy, type NsfPolicy } from "@/hooks/useSettings";
import { QueryState } from "@/components/common/QueryState";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const parseDelays = (s: string): number[] =>
  s
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 0);

const ACTIVE_OPTS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

function PolicyDialog({ policy }: { policy?: NsfPolicy }) {
  const save = useSaveNsfPolicy();
  const editing = !!policy;
  return (
    <QuickFormDialog
      trigger={
        <Button
          size="sm"
          variant={editing ? "ghost" : "default"}
          className={editing ? "h-7 text-xs" : ""}
        >
          {editing ? "Edit" : "New policy"}
        </Button>
      }
      title={editing ? "Edit NSF policy" : "New NSF retry policy"}
      pending={save.isPending}
      fields={[
        {
          name: "name",
          label: "Name",
          required: true,
          full: true,
          defaultValue: policy?.name ?? "",
        },
        {
          name: "max_attempts",
          label: "Max attempts",
          type: "number",
          defaultValue: String(policy?.max_attempts ?? 3),
        },
        {
          name: "delay_pattern",
          label: "Delay pattern (days between retries, comma-separated)",
          full: true,
          defaultValue: (policy?.delay_pattern ?? []).join(", "),
          placeholder: "3, 5, 7",
        },
        {
          name: "is_active",
          label: "Status",
          type: "select",
          options: ACTIVE_OPTS,
          defaultValue: policy?.is_active === false ? "false" : "true",
        },
      ]}
      onSubmit={async (v) => {
        try {
          await save.mutateAsync({
            id: policy?.id ?? null,
            name: v.name,
            max_attempts: Math.max(1, parseInt(v.max_attempts, 10) || 3),
            delay_pattern: parseDelays(v.delay_pattern),
            is_active: v.is_active === "true",
          });
          toast.success(editing ? "Policy updated." : "Policy created.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

export function NsfRetrySettingsTab() {
  const q = useNsfPolicies();
  const rows = q.data ?? [];
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">NSF retry policies</CardTitle>
          <CardDescription>How failed (NSF) payments are retried.</CardDescription>
        </div>
        <PolicyDialog />
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={q.isLoading}
          error={q.error}
          isEmpty={rows.length === 0}
          emptyMessage="No retry policies yet."
        >
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Max attempts</th>
                  <th className="px-3 py-2 font-medium">Delays (days)</th>
                  <th className="px-3 py-2 font-medium">Active</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2">{p.max_attempts}</td>
                    <td className="px-3 py-2">{(p.delay_pattern ?? []).join(", ") || "—"}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={p.is_active ? "active" : "inactive"} />
                    </td>
                    <td className="px-3 py-2">
                      <PolicyDialog policy={p} />
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
