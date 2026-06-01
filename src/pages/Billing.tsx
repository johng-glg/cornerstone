import { useBillingList } from "@/hooks/useModules";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

export default function Billing() {
  const q = useBillingList();
  return (
    <ListPage
      title="Billing"
      description="Time & expense entries. Forth / processor billing populates once those integrations are deployed."
      query={q}
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
