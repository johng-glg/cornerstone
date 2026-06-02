import { toast } from "sonner";
import {
  useScoringProfiles,
  useSaveScoringProfile,
  type ScoringProfile,
} from "@/hooks/useSettings";
import { QueryState } from "@/components/common/QueryState";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/format";

const INTEREST = ["", "debt_resolution", "litigation", "both"];
const SOURCES = ["", "web_form", "referral", "phone", "advertisement", "walk_in", "other"];
const ACTIVE_OPTS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];
const YESNO = [
  { value: "false", label: "No" },
  { value: "true", label: "Yes" },
];
const opt = (vals: string[]) => vals.map((v) => ({ value: v, label: v ? titleCase(v) : "Any" }));

function ProfileDialog({ profile }: { profile?: ScoringProfile }) {
  const save = useSaveScoringProfile();
  const editing = !!profile;
  return (
    <QuickFormDialog
      trigger={
        <Button
          size="sm"
          variant={editing ? "ghost" : "default"}
          className={editing ? "h-7 text-xs" : ""}
        >
          {editing ? "Edit" : "New profile"}
        </Button>
      }
      title={editing ? "Edit scoring profile" : "New scoring profile"}
      pending={save.isPending}
      fields={[
        {
          name: "name",
          label: "Name",
          required: true,
          full: true,
          defaultValue: profile?.name ?? "",
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          defaultValue: profile?.description ?? "",
        },
        {
          name: "interest_type",
          label: "Interest (optional)",
          type: "select",
          options: opt(INTEREST),
          defaultValue: profile?.interest_type ?? "",
        },
        {
          name: "source",
          label: "Source (optional)",
          type: "select",
          options: opt(SOURCES),
          defaultValue: profile?.source ?? "",
        },
        {
          name: "is_default",
          label: "Default profile",
          type: "select",
          options: YESNO,
          defaultValue: profile?.is_default ? "true" : "false",
        },
        {
          name: "is_active",
          label: "Status",
          type: "select",
          options: ACTIVE_OPTS,
          defaultValue: profile?.is_active === false ? "false" : "true",
        },
      ]}
      onSubmit={async (v) => {
        try {
          await save.mutateAsync({
            id: profile?.id ?? null,
            name: v.name,
            description: v.description || null,
            interest_type: v.interest_type || null,
            source: v.source || null,
            is_default: v.is_default === "true",
            is_active: v.is_active === "true",
          });
          toast.success(editing ? "Profile updated." : "Profile created.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

export function ScoringProfilesSettingsTab() {
  const q = useScoringProfiles();
  const rows = q.data ?? [];
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Lead scoring profiles</CardTitle>
          <CardDescription>
            Profiles the scoring engine applies (criteria weights are managed by the engine).
          </CardDescription>
        </div>
        <ProfileDialog />
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={q.isLoading}
          error={q.error}
          isEmpty={rows.length === 0}
          emptyMessage="No scoring profiles yet."
        >
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Interest</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Default</th>
                  <th className="px-3 py-2 font-medium">Active</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2">
                      {p.interest_type ? titleCase(p.interest_type) : "Any"}
                    </td>
                    <td className="px-3 py-2">{p.source ? titleCase(p.source) : "Any"}</td>
                    <td className="px-3 py-2">{p.is_default ? "Yes" : "—"}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={p.is_active ? "active" : "inactive"} />
                    </td>
                    <td className="px-3 py-2">
                      <ProfileDialog profile={p} />
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
