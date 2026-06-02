import { useState } from "react";
import { toast } from "sonner";
import {
  useEligibilityReviews,
  type EligibilityReviewRow,
  type EligibilityChecklistItem,
} from "@/hooks/useModules";
import { useReviewEligibility, useSaveEligibilityChecklist } from "@/hooks/useModuleMutations";
import { useRecordActivity } from "@/hooks/useActivityLog";
import { useAuth } from "@/lib/auth";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

function leadName(r: EligibilityReviewRow): string {
  return r.lead ? `${r.lead.first_name} ${r.lead.last_name}` : r.lead_id.slice(0, 8);
}

function ReviewDialog({ review }: { review: EligibilityReviewRow }) {
  const { staff } = useAuth();
  const reviewMut = useReviewEligibility();
  const saveChecklist = useSaveEligibilityChecklist();
  const record = useRecordActivity();

  const [open, setOpen] = useState(false);
  const [checklist, setChecklist] = useState<EligibilityChecklistItem[]>(review.checklist);
  const [notes, setNotes] = useState(review.review_notes ?? "");
  const [declineReason, setDeclineReason] = useState("");

  const reviewed = review.status !== "pending";
  const pending = reviewMut.isPending || saveChecklist.isPending;
  const done = checklist.filter((c) => c.completed).length;

  const toggle = (step: string) =>
    setChecklist((prev) =>
      prev.map((c) =>
        c.step === step
          ? {
              ...c,
              completed: !c.completed,
              completed_at: !c.completed ? new Date().toISOString() : null,
              completed_by: !c.completed ? (staff?.id ?? null) : null,
            }
          : c,
      ),
    );

  const logActivity = (description: string) =>
    record({
      entityType: "lead",
      entityId: review.lead_id,
      category: "eligibility",
      description,
      metadata: { review_id: review.id },
    });

  const saveProgress = () =>
    saveChecklist.mutate(
      { id: review.id, checklist, review_notes: notes },
      {
        onSuccess: () => toast.success("Progress saved."),
        onError: (e) => toast.error(e.message),
      },
    );

  const decide = (status: "approved" | "declined") => {
    if (status === "declined" && !declineReason.trim()) {
      toast.error("A decline reason is required.");
      return;
    }
    reviewMut.mutate(
      {
        id: review.id,
        status,
        decline_reason: status === "declined" ? declineReason.trim() : null,
        review_notes: notes,
      },
      {
        onSuccess: () => {
          void logActivity(
            status === "approved"
              ? `Eligibility approved for ${leadName(review)}`
              : `Eligibility declined for ${leadName(review)} — ${declineReason.trim()}`,
          );
          toast.success(`Marked ${status}.`);
          setOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7">
          {reviewed ? "View" : "Review"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Eligibility review — {leadName(review)}</DialogTitle>
          <DialogDescription>
            Work the checklist, then approve or decline. A decline requires a reason.
          </DialogDescription>
        </DialogHeader>

        {/* Lead context */}
        <div className="grid grid-cols-2 gap-2 rounded-md border p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Lead status</p>
            <p className="font-medium">{review.lead ? titleCase(review.lead.status) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estimated debt</p>
            <p className="font-medium">
              {review.lead?.estimated_debt_amount != null
                ? formatCurrency(review.lead.estimated_debt_amount)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Submitted</p>
            <p className="font-medium">{formatDate(review.submitted_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Review status</p>
            <p>
              <StatusBadge status={review.status} />
            </p>
          </div>
        </div>

        {/* Flags */}
        {review.flags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {review.flags.map((f) => (
              <span
                key={f}
                className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
              >
                {titleCase(f)}
              </span>
            ))}
          </div>
        )}

        {/* Checklist */}
        <div className="space-y-2">
          <Label>
            Checklist ({done}/{checklist.length})
          </Label>
          {checklist.length === 0 && (
            <p className="text-sm text-muted-foreground">No checklist on this review.</p>
          )}
          <ul className="space-y-1">
            {checklist.map((c) => (
              <li key={c.step}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={c.completed}
                    disabled={reviewed || pending}
                    onChange={() => toggle(c.step)}
                  />
                  <span className={c.completed ? "text-muted-foreground line-through" : ""}>
                    {titleCase(c.step)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <Label htmlFor="review_notes">Review notes</Label>
          <Textarea
            id="review_notes"
            rows={2}
            value={notes}
            disabled={reviewed}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {reviewed ? (
          review.status === "declined" && (
            <p className="text-sm">
              <span className="text-muted-foreground">Decline reason: </span>
              {review.decline_reason ?? "—"}
            </p>
          )
        ) : (
          <div className="space-y-1">
            <Label htmlFor="decline_reason">Decline reason (required to decline)</Label>
            <Input
              id="decline_reason"
              value={declineReason}
              placeholder="e.g. Debt below program minimum"
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </div>
        )}

        {!reviewed && (
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" disabled={pending} onClick={saveProgress}>
              Save progress
            </Button>
            <span className="flex gap-2">
              <Button
                variant="outline"
                className="text-destructive"
                disabled={pending}
                onClick={() => decide("declined")}
              >
                Decline
              </Button>
              <Button disabled={pending} onClick={() => decide("approved")}>
                Approve
              </Button>
            </span>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function EligibilityReviews() {
  const q = useEligibilityReviews();
  return (
    <ListPage
      title="Eligibility Reviews"
      description="Lead eligibility submissions awaiting / completed review."
      query={q}
      searchText={(r) => `${leadName(r)} ${r.status}`}
      empty="No eligibility reviews."
      columns={[
        { header: "Lead", cell: (r) => leadName(r) },
        {
          header: "Checklist",
          cell: (r) =>
            r.checklist.length
              ? `${r.checklist.filter((c) => c.completed).length}/${r.checklist.length}`
              : "—",
        },
        { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
        { header: "Submitted", cell: (r) => formatDate(r.submitted_at) },
        { header: "Reviewed", cell: (r) => formatDate(r.reviewed_at) },
        { header: "Decline reason", cell: (r) => r.decline_reason ?? "—" },
        { header: "", cell: (r) => <ReviewDialog review={r} /> },
      ]}
    />
  );
}
