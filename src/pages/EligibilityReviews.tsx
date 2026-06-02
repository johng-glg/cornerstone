import { toast } from "sonner";
import { useEligibilityReviews } from "@/hooks/useModules";
import { useReviewEligibility } from "@/hooks/useModuleMutations";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

function ReviewActions({ id, status }: { id: string; status: string }) {
  const review = useReviewEligibility();
  if (status !== "pending") return <span className="text-xs text-muted-foreground">Reviewed</span>;
  const act = (decision: "approved" | "declined") =>
    review.mutate(
      {
        id,
        status: decision,
        decline_reason: decision === "declined" ? "Did not meet criteria" : null,
      },
      {
        onSuccess: () => toast.success(`Marked ${decision}.`),
        onError: (e) => toast.error(e.message),
      },
    );
  return (
    <span className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        className="h-7"
        disabled={review.isPending}
        onClick={() => act("approved")}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-destructive"
        disabled={review.isPending}
        onClick={() => act("declined")}
      >
        Decline
      </Button>
    </span>
  );
}

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
        { header: "Actions", cell: (r) => <ReviewActions id={r.id} status={r.status} /> },
      ]}
    />
  );
}
