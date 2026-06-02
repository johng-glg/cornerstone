import { toast } from "sonner";
import { useBillingList } from "@/hooks/useModules";
import { useAddBillingEntry } from "@/hooks/useModuleMutations";
import { ListPage } from "@/components/common/ListPage";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

function AddBillingAction() {
  const add = useAddBillingEntry();
  return (
    <QuickFormDialog
      trigger={<Button size="sm">New entry</Button>}
      title="New billing entry"
      pending={add.isPending}
      fields={[
        {
          name: "entry_type",
          label: "Type",
          type: "select",
          required: true,
          defaultValue: "time",
          options: [
            { value: "time", label: "Time" },
            { value: "expense", label: "Expense" },
          ],
        },
        { name: "total_amount", label: "Amount ($)", type: "number", required: true },
        { name: "description", label: "Description", required: true, full: true },
        {
          name: "is_billable",
          label: "Billable",
          type: "select",
          defaultValue: "yes",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        },
      ]}
      onSubmit={async (v) => {
        try {
          await add.mutateAsync({
            entry_type: v.entry_type,
            description: v.description,
            total_amount: Number(v.total_amount) || 0,
            is_billable: v.is_billable !== "no",
          });
          toast.success("Billing entry added.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

export default function Billing() {
  const q = useBillingList();
  return (
    <ListPage
      title="Billing"
      description="Time & expense entries. Forth / processor billing populates once those integrations are deployed."
      query={q}
      action={<AddBillingAction />}
      empty="No billing entries."
      columns={[
        { header: "Date", cell: (b) => formatDate(b.billing_date) },
        { header: "Type", cell: (b) => titleCase(b.entry_type) },
        { header: "Description", cell: (b) => b.description },
        { header: "Amount", cell: (b) => formatCurrency(b.total_amount) },
        { header: "Billable", cell: (b) => (b.is_billable ? "Yes" : "No") },
        { header: "Status", cell: (b) => <StatusBadge status={b.status} /> },
      ]}
    />
  );
}
