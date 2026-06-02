import { toast } from "sonner";
import { useCreditors } from "@/hooks/useModules";
import { useAddCreditor } from "@/hooks/useModuleMutations";
import { ListPage } from "@/components/common/ListPage";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/format";

const TYPES = [
  { value: "original_creditor", label: "Original Creditor" },
  { value: "collection_agency", label: "Collection Agency" },
  { value: "debt_buyer", label: "Debt Buyer" },
  { value: "law_firm", label: "Law Firm" },
];

function AddCreditorAction() {
  const add = useAddCreditor();
  return (
    <QuickFormDialog
      trigger={<Button size="sm">New creditor</Button>}
      title="New creditor"
      pending={add.isPending}
      fields={[
        { name: "name", label: "Name", required: true, full: true },
        {
          name: "creditor_type",
          label: "Type",
          type: "select",
          options: TYPES,
          required: true,
          defaultValue: "original_creditor",
        },
        { name: "state", label: "State", placeholder: "CA" },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email", type: "email", full: true },
      ]}
      onSubmit={async (v) => {
        try {
          await add.mutateAsync({
            name: v.name,
            creditor_type: v.creditor_type,
            state: v.state,
            phone: v.phone,
            email: v.email,
          });
          toast.success("Creditor added.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

export default function Creditors() {
  const q = useCreditors();
  return (
    <ListPage
      title="Creditors"
      description="Creditor directory."
      query={q}
      action={<AddCreditorAction />}
      searchText={(c) => `${c.name} ${c.creditor_type ?? ""} ${c.state ?? ""} ${c.email ?? ""}`}
      empty="No creditors yet."
      columns={[
        { header: "Name", cell: (c) => c.name },
        { header: "Type", cell: (c) => (c.creditor_type ? titleCase(c.creditor_type) : "—") },
        { header: "Phone", cell: (c) => c.phone ?? "—" },
        { header: "Email", cell: (c) => c.email ?? "—" },
        { header: "State", cell: (c) => c.state ?? "—" },
        {
          header: "Active",
          cell: (c) => <StatusBadge status={c.is_active ? "active" : "inactive"} />,
        },
      ]}
    />
  );
}
