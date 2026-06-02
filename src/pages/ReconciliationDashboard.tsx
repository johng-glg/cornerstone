import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useReconciliation } from "@/hooks/useModules";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate, titleCase } from "@/lib/format";

export default function ReconciliationDashboard() {
  const q = useReconciliation();
  return (
    <div className="space-y-4">
      <Link
        to="/reports"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to reports
      </Link>
      <ListPage
        title="Reconciliation"
        description="Discrepancies surfaced by the PLSA reconciliation detectors."
        query={q}
        empty="No reconciliation findings — everything balances."
        columns={[
          { header: "Detector", cell: (r) => titleCase(r.detector) },
          { header: "Severity", cell: (r) => <StatusBadge status={r.severity} /> },
          { header: "Entity", cell: (r) => (r.entity_type ? titleCase(r.entity_type) : "—") },
          { header: "Summary", cell: (r) => r.summary },
          { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { header: "Found", cell: (r) => formatDate(r.created_at) },
        ]}
      />
    </div>
  );
}
