import { useFeatureRequests } from "@/hooks/useModules";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate, titleCase } from "@/lib/format";

export default function FeatureRequests() {
  const q = useFeatureRequests();
  return (
    <ListPage
      title="Feature Requests"
      description="Ideas and improvement requests from the team."
      query={q}
      empty="No feature requests yet."
      columns={[
        { header: "Title", cell: (r) => r.title },
        { header: "Category", cell: (r) => (r.category ? titleCase(r.category) : "—") },
        { header: "Type", cell: (r) => (r.request_type ? titleCase(r.request_type) : "—") },
        {
          header: "Priority",
          cell: (r) => (r.priority ? <StatusBadge status={r.priority} /> : "—"),
        },
        { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
        { header: "Votes", cell: (r) => r.votes ?? 0 },
        { header: "Submitted", cell: (r) => formatDate(r.created_at) },
      ]}
    />
  );
}
