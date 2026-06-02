import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStaffList } from "@/hooks/useModules";
import { ListPage } from "@/components/common/ListPage";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/format";

const DEPARTMENTS = [
  "admin",
  "sales_intake",
  "client_services",
  "attorney",
  "case_manager",
  "negotiations",
  "payment_processing",
  "correspondence",
];
const ROLES = [
  "admin",
  "attorney",
  "paralegal",
  "negotiator",
  "case_manager",
  "sales_rep",
  "client_services_rep",
  "payment_processor",
  "correspondent",
  "viewer",
];

function InviteStaffAction() {
  return (
    <QuickFormDialog
      trigger={<Button size="sm">Invite staff</Button>}
      title="Invite staff member"
      description="Creates their account; they sign in with their @guardianlit.com Google login."
      fields={[
        { name: "first_name", label: "First name", required: true },
        { name: "last_name", label: "Last name", required: true },
        { name: "email", label: "Email", type: "email", required: true, full: true },
        {
          name: "department",
          label: "Department",
          type: "select",
          required: true,
          defaultValue: "client_services",
          options: DEPARTMENTS.map((d) => ({ value: d, label: titleCase(d) })),
        },
        {
          name: "role",
          label: "Role",
          type: "select",
          required: true,
          defaultValue: "client_services_rep",
          options: ROLES.map((r) => ({ value: r, label: titleCase(r) })),
        },
        { name: "job_title", label: "Job title", full: true },
      ]}
      onSubmit={async (v) => {
        const { data, error } = await supabase.functions.invoke("invite-staff", {
          body: {
            first_name: v.first_name,
            last_name: v.last_name,
            email: v.email,
            department: v.department,
            role: v.role,
            job_title: v.job_title || undefined,
          },
        });
        const d = data as { success?: boolean; error?: string } | null;
        if (error || d?.success === false) {
          // Surface the function's real error body when present.
          let msg = error?.message ?? d?.error ?? "Invite failed.";
          const ctx = (error as { context?: Response } | null)?.context;
          if (ctx && typeof ctx.json === "function") {
            try {
              const body = (await ctx.json()) as { error?: string };
              if (body?.error) msg = body.error;
            } catch {
              /* keep msg */
            }
          }
          toast.error(msg);
          throw new Error(msg);
        }
        toast.success("Staff member invited.");
      }}
    />
  );
}

export default function Staff() {
  const q = useStaffList();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  return (
    <ListPage
      title="Staff"
      description="People in your firm."
      query={q}
      action={isAdmin ? <InviteStaffAction /> : undefined}
      searchText={(s) =>
        `${s.first_name} ${s.last_name} ${s.email} ${s.department} ${s.job_title ?? ""}`
      }
      exportRow={(s) => ({
        Name: `${s.first_name} ${s.last_name}`,
        Email: s.email,
        Department: titleCase(s.department),
        Title: s.job_title ?? "",
        Active: s.is_active ? "Yes" : "No",
      })}
      empty="No staff yet."
      columns={[
        { header: "Name", cell: (s) => `${s.first_name} ${s.last_name}` },
        { header: "Email", cell: (s) => s.email },
        { header: "Department", cell: (s) => titleCase(s.department) },
        { header: "Title", cell: (s) => s.job_title ?? "—" },
        {
          header: "Active",
          cell: (s) => <StatusBadge status={s.is_active ? "active" : "inactive"} />,
        },
      ]}
    />
  );
}
