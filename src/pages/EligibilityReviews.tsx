import { useEligibilityReviews } from "@/hooks/useModules";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/format";

export default function EligibilityReviews() {
  const q = useEligibilityReviews();
  return (
    <ListPage
      title="Eligibility Reviews"
      description="Lead eligibility submissions awaiting / completed review."
      query={q}
      empty="No eligibility reviews."
      columns={[
        {
          header: "Lead",
          cell: (r) => <span className="font-mono text-xs">{r.lead_id.slice(0, 8)}</span>,
        },
        { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
        { header: "Submitted", cell: (r) => formatDate(r.submitted_at) },
        { header: "Reviewed", cell: (r) => formatDate(r.reviewed_at) },
        { header: "Decline reason", cell: (r) => r.decline_reason ?? "—" },
      ]}
    />
  );
}
