import { usePaymentsList } from "@/hooks/useModules";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate, titleCase } from "@/lib/format";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function Payments() {
  const q = usePaymentsList();
  return (
    <ListPage
      title="Payments"
      description="PLSA / processor transactions across all engagements."
      query={q}
      empty="No payments recorded yet."
      columns={[
        { header: "Type", cell: (t) => titleCase(t.transaction_type) },
        { header: "Amount", cell: (t) => usd.format(t.amount) },
        { header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
        { header: "Scheduled", cell: (t) => formatDate(t.scheduled_date) },
        { header: "Processed", cell: (t) => formatDate(t.processed_at) },
        { header: "Provider", cell: (t) => t.plsa_provider_id },
      ]}
    />
  );
}
