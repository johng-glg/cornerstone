import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { ROLE_VIEWS, useAuth } from "@/lib/auth";
import {
  PERMISSION_MODULES,
  useRolePermissions,
  useUpsertRolePermission,
  type RolePerm,
} from "@/hooks/useRolePermissions";
import { QueryState } from "@/components/common/QueryState";
import { titleCase } from "@/lib/format";

const FLAGS = ["can_read", "can_create", "can_update", "can_delete"] as const;
const FLAG_LABEL: Record<string, string> = {
  can_read: "Read",
  can_create: "Create",
  can_update: "Update",
  can_delete: "Delete",
};

export default function Roles() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [role, setRole] = useState("admin");
  const q = useRolePermissions(role);
  const upsert = useUpsertRolePermission();

  const byModule = new Map((q.data ?? []).map((p) => [p.module, p]));
  const permFor = (module: string): RolePerm =>
    byModule.get(module) ?? {
      module,
      can_read: false,
      can_create: false,
      can_update: false,
      can_delete: false,
    };

  const toggle = (module: string, flag: (typeof FLAGS)[number], value: boolean) => {
    const next = { ...permFor(module), [flag]: value };
    upsert.mutate({ ...next, role }, { onError: (e) => toast.error(e.message) });
  };

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">Only admins can edit roles.</p>;
  }

  return (
    <div className="space-y-4">
      <Link
        to="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to settings
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Roles &amp; permissions</h1>
        <p className="text-sm text-muted-foreground">
          What each role may do per module. Changes save immediately.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Role</span>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {ROLE_VIEWS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      <QueryState isLoading={q.isLoading} error={q.error} isEmpty={false}>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Module</th>
                {FLAGS.map((f) => (
                  <th key={f} className="px-3 py-2 text-center font-medium">
                    {FLAG_LABEL[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MODULES.map((m) => {
                const p = permFor(m);
                return (
                  <tr key={m} className="border-b last:border-0">
                    <td className="px-3 py-2">{titleCase(m)}</td>
                    {FLAGS.map((f) => (
                      <td key={f} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={p[f]}
                          disabled={upsert.isPending}
                          onChange={(e) => toggle(m, f, e.target.checked)}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
