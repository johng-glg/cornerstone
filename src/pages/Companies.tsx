import { toast } from "sonner";
import { useCompaniesList } from "@/hooks/useModules";
import { useAddCompany } from "@/hooks/useModuleMutations";
import { useAuth } from "@/lib/auth";
import { ListPage } from "@/components/common/ListPage";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/format";

const COMPANY_TYPES = [
  { value: "law_firm", label: "Law Firm" },
  { value: "affiliate", label: "Affiliate" },
  { value: "financing_company", label: "Financing Company" },
];

function AddCompanyAction() {
  const add = useAddCompany();
  return (
    <QuickFormDialog
      trigger={<Button size="sm">New company</Button>}
      title="New company"
      pending={add.isPending}
      fields={[
        { name: "name", label: "Name", required: true, full: true },
        {
          name: "company_type",
          label: "Type",
          type: "select",
          required: true,
          defaultValue: "law_firm",
          options: COMPANY_TYPES,
        },
        { name: "city", label: "City" },
        { name: "state", label: "State", placeholder: "CA" },
      ]}
      onSubmit={async (v) => {
        try {
          await add.mutateAsync({
            name: v.name,
            company_type: v.company_type,
            city: v.city || null,
            state: v.state || null,
          });
          toast.success("Company added.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

export default function Companies() {
  const q = useCompaniesList();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  return (
    <ListPage
      title="Companies"
      description="Tenant companies you can access."
      query={q}
      action={isAdmin ? <AddCompanyAction /> : undefined}
      searchText={(c) => `${c.name} ${c.company_type} ${c.city ?? ""} ${c.state ?? ""}`}
      empty="No companies."
      columns={[
        { header: "Name", cell: (c) => c.name },
        { header: "Type", cell: (c) => titleCase(c.company_type) },
        { header: "City", cell: (c) => c.city ?? "—" },
        { header: "State", cell: (c) => c.state ?? "—" },
        {
          header: "Active",
          cell: (c) => <StatusBadge status={c.is_active ? "active" : "inactive"} />,
        },
      ]}
    />
  );
}
