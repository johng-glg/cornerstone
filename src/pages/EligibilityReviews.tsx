import { useState } from 'react';
import { useEligibilityReviews, type EligibilityReview } from '@/hooks/useEligibilityReviews';
import { EligibilityReviewDetailSheet } from '@/components/eligibility/EligibilityReviewDetailSheet';
import { EligibilityPipelineProgress } from '@/components/eligibility/EligibilityPipelineProgress';
import { ReviewFlagsBadges } from '@/components/eligibility/ReviewFlagsBadges';
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function EligibilityReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const { data: reviews, isLoading } = useEligibilityReviews(statusFilter || undefined);
  const [selectedReview, setSelectedReview] = useState<EligibilityReview | null>(null);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const statusBadge = (status: string) => {
    const config: Record<string, { icon: typeof Clock; color: string }> = {
      pending: { icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
      approved: { icon: ShieldCheck, color: 'text-green-600 dark:text-green-400' },
      declined: { icon: XCircle, color: 'text-red-600 dark:text-red-400' },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <Badge variant="outline" className={cn('capitalize', c.color)}>
        <Icon className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">Eligibility Reviews</h1>
        <p className="text-muted-foreground">Review and approve lead submissions for program eligibility.</p>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="declined">Declined</TabsTrigger>
          <TabsTrigger value="">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {statusFilter ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Reviews` : 'All Reviews'}
            {reviews && <span className="text-muted-foreground font-normal ml-2">({reviews.length})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !reviews || reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No {statusFilter || ''} reviews found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Est. Debt</TableHead>
                  <TableHead>Debts</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow
                    key={review.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedReview(review)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {review.lead?.first_name} {review.lead?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{review.lead?.lead_number}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {review.submitted_at ? format(new Date(review.submitted_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {review.lead?.estimated_debt_amount
                        ? `$${review.lead.estimated_debt_amount.toLocaleString()}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {review.lead?.number_of_debts ?? '—'}
                    </TableCell>
                    <TableCell>
                      <EligibilityPipelineProgress checklist={review.checklist} compact />
                    </TableCell>
                    <TableCell>
                      <ReviewFlagsBadges flags={review.flags} compact />
                    </TableCell>
                    <TableCell>{statusBadge(review.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {review.reviewed_staff
                        ? `${review.reviewed_staff.first_name} ${review.reviewed_staff.last_name}`
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EligibilityReviewDetailSheet
        review={selectedReview}
        open={!!selectedReview}
        onOpenChange={(open) => !open && setSelectedReview(null)}
        onOpenLead={(leadId) => {
          setSelectedReview(null);
          setOpenLeadId(leadId);
        }}
      />

      <LeadDetailSheet
        leadId={openLeadId}
        onClose={() => setOpenLeadId(null)}
        onConvert={() => {}}
      />
    </div>
  );
}
