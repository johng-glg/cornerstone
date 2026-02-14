import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReviewFlagsBadges } from './ReviewFlagsBadges';
import { useReviewDecision, type EligibilityReview } from '@/hooks/useEligibilityReviews';
import { ShieldCheck, XCircle, Loader2, Phone, Mail, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface EligibilityReviewDetailSheetProps {
  review: EligibilityReview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EligibilityReviewDetailSheet({ review, open, onOpenChange }: EligibilityReviewDetailSheetProps) {
  const [notes, setNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const reviewDecision = useReviewDecision();

  const handleDecision = (decision: 'approved' | 'declined') => {
    if (!review) return;
    reviewDecision.mutate(
      { reviewId: review.id, decision, notes, declineReason },
      { onSuccess: () => { setNotes(''); setDeclineReason(''); onOpenChange(false); } }
    );
  };

  if (!review) return null;

  const lead = review.lead;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {lead ? `${lead.first_name} ${lead.last_name}` : 'Eligibility Review'}
          </SheetTitle>
          <SheetDescription>
            {lead?.lead_number} · Submitted {review.submitted_at ? format(new Date(review.submitted_at), 'MMM d, yyyy') : 'N/A'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Lead Summary */}
          {lead && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lead Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lead.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{lead.email}</span>
                  </div>
                )}
                {lead.estimated_debt_amount && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>${lead.estimated_debt_amount.toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Flags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Underwriting Flags ({review.flags.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewFlagsBadges flags={review.flags} />
              <div className="mt-3 space-y-2">
                {review.flags.map((flag) => (
                  <div key={flag.code} className="text-sm text-muted-foreground">
                    <strong>{flag.label}:</strong> {flag.details}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Decision Form - only for pending */}
          {review.status === 'pending' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Review Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Review Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes about this review..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Decline Reason (if declining)</Label>
                  <Textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Reason for declining..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDecision('approved')}
                    disabled={reviewDecision.isPending}
                    className="flex-1"
                  >
                    {reviewDecision.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDecision('declined')}
                    disabled={reviewDecision.isPending || !declineReason}
                    className="flex-1"
                  >
                    {reviewDecision.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Already reviewed */}
          {review.status !== 'pending' && (
            <Card>
              <CardContent className="p-4">
                <Badge variant={review.status === 'approved' ? 'default' : 'destructive'}>
                  {review.status === 'approved' ? 'Approved' : 'Declined'}
                </Badge>
                {review.review_notes && (
                  <p className="text-sm mt-2">{review.review_notes}</p>
                )}
                {review.decline_reason && (
                  <p className="text-sm mt-2 text-destructive">{review.decline_reason}</p>
                )}
                {review.reviewed_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Reviewed {format(new Date(review.reviewed_at), 'MMM d, yyyy h:mm a')}
                    {review.reviewed_staff && ` by ${review.reviewed_staff.first_name} ${review.reviewed_staff.last_name}`}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
