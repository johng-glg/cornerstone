import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReviewFlagsBadges } from '@/components/eligibility/ReviewFlagsBadges';
import { useEligibilityReviewForLead, useSubmitForReview } from '@/hooks/useEligibilityReviews';
import { ShieldCheck, Clock, XCircle, RotateCcw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EligibilityReviewCardProps {
  leadId: string;
  leadStatus: string;
}

export function EligibilityReviewCard({ leadId, leadStatus }: EligibilityReviewCardProps) {
  const { data: review, isLoading } = useEligibilityReviewForLead(leadId);
  const submitForReview = useSubmitForReview();

  // Show submit button for qualified leads with no review
  if (leadStatus === 'qualified' && !review) {
    return (
      <Card className="border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Ready for Eligibility Review</p>
              <p className="text-xs text-muted-foreground">Submit this lead for underwriting review</p>
            </div>
            <Button
              size="sm"
              onClick={() => submitForReview.mutate(leadId)}
              disabled={submitForReview.isPending}
            >
              {submitForReview.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit for Review
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !review) return null;

  const statusConfig: Record<string, { icon: typeof Clock; label: string; color: string }> = {
    pending: { icon: Clock, label: 'Pending Review', color: 'text-amber-600 dark:text-amber-400' },
    approved: { icon: ShieldCheck, label: 'Approved', color: 'text-green-600 dark:text-green-400' },
    declined: { icon: XCircle, label: 'Declined', color: 'text-red-600 dark:text-red-400' },
  };

  const config = statusConfig[review.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4', config.color)} />
            Eligibility Review
          </span>
          <Badge variant="outline" className={cn('text-xs', config.color)}>
            {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ReviewFlagsBadges flags={review.flags} />

        {review.submitted_at && (
          <p className="text-xs text-muted-foreground">
            Submitted {format(new Date(review.submitted_at), 'MMM d, yyyy h:mm a')}
            {review.submitted_staff && ` by ${review.submitted_staff.first_name} ${review.submitted_staff.last_name}`}
          </p>
        )}

        {review.reviewed_at && (
          <p className="text-xs text-muted-foreground">
            Reviewed {format(new Date(review.reviewed_at), 'MMM d, yyyy h:mm a')}
            {review.reviewed_staff && ` by ${review.reviewed_staff.first_name} ${review.reviewed_staff.last_name}`}
          </p>
        )}

        {review.review_notes && (
          <p className="text-sm bg-muted/50 rounded p-2">{review.review_notes}</p>
        )}

        {review.status === 'declined' && review.decline_reason && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded p-2 text-sm text-red-700 dark:text-red-300">
            <strong>Reason:</strong> {review.decline_reason}
          </div>
        )}

        {review.status === 'declined' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => submitForReview.mutate(leadId)}
            disabled={submitForReview.isPending}
          >
            {submitForReview.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Resubmit for Review
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
