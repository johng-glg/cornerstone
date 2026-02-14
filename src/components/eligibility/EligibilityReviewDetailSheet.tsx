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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ReviewFlagsBadges } from './ReviewFlagsBadges';
import { EligibilityPipelineProgress } from './EligibilityPipelineProgress';
import { EligibilityDebtsTab } from './EligibilityDebtsTab';
import { LeadDocumentsTab } from '@/components/leads/LeadDocumentsTab';
import { useReviewDecision, useUpdateReviewChecklist, type EligibilityReview } from '@/hooks/useEligibilityReviews';
import { ShieldCheck, XCircle, Loader2, Phone, Mail, DollarSign, MapPin, Briefcase, Calendar, ExternalLink, Star } from 'lucide-react';
import { format } from 'date-fns';

interface EligibilityReviewDetailSheetProps {
  review: EligibilityReview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLead?: (leadId: string) => void;
}

export function EligibilityReviewDetailSheet({ review, open, onOpenChange, onOpenLead }: EligibilityReviewDetailSheetProps) {
  const [notes, setNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const reviewDecision = useReviewDecision();
  const updateChecklist = useUpdateReviewChecklist();

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
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle>
                {lead ? `${lead.first_name} ${lead.last_name}` : 'Eligibility Review'}
              </SheetTitle>
              <SheetDescription>
                {lead?.lead_number} · Submitted {review.submitted_at ? format(new Date(review.submitted_at), 'MMM d, yyyy') : 'N/A'}
              </SheetDescription>
            </div>
            {lead && onOpenLead && (
              <Button variant="outline" size="sm" onClick={() => onOpenLead(lead.id)}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Full Lead
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-4">
          {/* Pipeline Progress */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <EligibilityPipelineProgress
                checklist={review.checklist}
                onToggle={(idx) =>
                  updateChecklist.mutate({
                    reviewId: review.id,
                    checklist: review.checklist,
                    toggleIndex: idx,
                  })
                }
              />
            </CardContent>
          </Card>

          <Tabs defaultValue="overview">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="debts">Debts</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="decision">Decision</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {lead && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    {lead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                    )}
                    {lead.state && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{lead.state}</span>
                      </div>
                    )}
                    {lead.date_of_birth && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{format(new Date(lead.date_of_birth), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {lead.employment_status && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="capitalize">{lead.employment_status.replace(/_/g, ' ')}</span>
                        {lead.employer_name && <span className="text-muted-foreground">at {lead.employer_name}</span>}
                      </div>
                    )}
                    {lead.monthly_income != null && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>${lead.monthly_income.toLocaleString()}/mo</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {lead && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Program Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    {lead.interest_type && (
                      <div>
                        <span className="text-muted-foreground">Interest:</span>{' '}
                        <Badge variant="outline" className="capitalize ml-1">{lead.interest_type.replace(/_/g, ' ')}</Badge>
                      </div>
                    )}
                    {lead.estimated_debt_amount != null && (
                      <div>
                        <span className="text-muted-foreground">Est. Debt:</span>{' '}
                        <span className="font-medium">${lead.estimated_debt_amount.toLocaleString()}</span>
                      </div>
                    )}
                    {lead.number_of_debts != null && (
                      <div>
                        <span className="text-muted-foreground">Debts:</span>{' '}
                        <span className="font-medium">{lead.number_of_debts}</span>
                      </div>
                    )}
                    {lead.lead_score != null && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        <span className="font-medium">{lead.lead_score}</span>
                        <span className="text-muted-foreground">score</span>
                      </div>
                    )}
                    {lead.has_active_lawsuit && (
                      <div>
                        <Badge variant="destructive" className="text-xs">Active Lawsuit</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Debts Tab */}
            <TabsContent value="debts">
              {review.lead_id && <EligibilityDebtsTab leadId={review.lead_id} />}
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              {review.lead_id && <LeadDocumentsTab leadId={review.lead_id} />}
            </TabsContent>

            {/* Decision Tab */}
            <TabsContent value="decision" className="space-y-4">
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
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
