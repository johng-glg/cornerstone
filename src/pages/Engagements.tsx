import { useNavigate } from "react-router-dom";
import { useClientServices } from "@/hooks/useCoreCrm";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

export default function Engagements() {
  const q = useClientServices();
  const navigate = useNavigate();
  return (
    <ListPage
      title="Engagements"
      description="Active client service programs."
      query={q}
      empty="No engagements yet."
      onRowClick={(s) => s.primary_client_id && navigate(`/clients/${s.primary_client_id}`)}
      columns={[
        {
          header: "Service #",
          cell: (s) => <span className="font-mono text-xs">{s.service_number}</span>,
        },
        { header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
        { header: "Program", cell: (s) => (s.program_type ? titleCase(s.program_type) : "—") },
        { header: "Enrolled", cell: (s) => formatDate(s.enrolled_date) },
        { header: "Escrow", cell: (s) => formatCurrency(s.escrow_balance) },
        { header: "Provider", cell: (s) => s.plsa_provider_id },
      ]}
    />
  );
}
