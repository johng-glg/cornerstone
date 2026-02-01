import { useState } from 'react';
import { Scale, Calendar, AlertTriangle, Building2, FileText, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLitigationMattersForClient, type LitigationMatter, type LitigationStatus } from '@/hooks/useLitigationMatters';
import { format, differenceInDays, isPast } from 'date-fns';

interface ClientLitigationTabProps {
  clientId: string;
}

const statusBadgeColors: Record<LitigationStatus, string> = {
  pending_response: 'bg-red-100 text-red-800',
  discovery: 'bg-blue-100 text-blue-800',
  negotiation: 'bg-yellow-100 text-yellow-800',
  trial_prep: 'bg-orange-100 text-orange-800',
  trial: 'bg-purple-100 text-purple-800',
  settled: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-600',
  judgment: 'bg-red-100 text-red-800',
};

const statusLabels: Record<LitigationStatus, string> = {
  pending_response: 'Pending Response',
  discovery: 'Discovery',
  negotiation: 'Negotiation',
  trial_prep: 'Trial Prep',
  trial: 'Trial',
  settled: 'Settled',
  dismissed: 'Dismissed',
  judgment: 'Judgment',
};

const typeLabels: Record<string, string> = {
  credit_card: 'Credit Card',
  medical: 'Medical',
  auto_loan: 'Auto Loan',
  personal_loan: 'Personal Loan',
  student_loan: 'Student Loan',
  mortgage: 'Mortgage',
  other: 'Other',
};

const formatCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—';

export function ClientLitigationTab({ clientId }: ClientLitigationTabProps) {
  const { data: matters, isLoading } = useLitigationMattersForClient(clientId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Separate active and closed matters
  const activeMatters = matters?.filter(m => !['settled', 'dismissed', 'judgment'].includes(m.status)) || [];
  const closedMatters = matters?.filter(m => ['settled', 'dismissed', 'judgment'].includes(m.status)) || [];

  // Calculate urgent deadlines
  const urgentMatters = activeMatters.filter(m => {
    if (!m.response_deadline) return false;
    const deadline = new Date(m.response_deadline);
    const daysUntil = differenceInDays(deadline, new Date());
    return daysUntil <= 14 && !isPast(deadline);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Litigation Matters</h2>
          {activeMatters.length > 0 && (
            <Badge variant="secondary">{activeMatters.length} Active</Badge>
          )}
        </div>
      </div>

      {/* Urgent Deadlines Alert */}
      {urgentMatters.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentMatters.map((matter) => (
                <div key={matter.id} className="flex items-center justify-between text-sm">
                  <span className="text-red-800">
                    {matter.case_number || 'No case #'} - Response due
                  </span>
                  <Badge className="bg-red-100 text-red-800">
                    {matter.response_deadline && format(new Date(matter.response_deadline), 'MMM d, yyyy')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Matters */}
      {activeMatters.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Active Cases</h3>
          <div className="grid gap-4">
            {activeMatters.map((matter) => (
              <MatterCard key={matter.id} matter={matter} />
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active litigation matters</p>
            <p className="text-sm mt-1">
              Add a matter from a liability's detail view using "Add Matter"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Closed Matters */}
      {closedMatters.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Closed Cases</h3>
          <div className="grid gap-4 opacity-75">
            {closedMatters.map((matter) => (
              <MatterCard key={matter.id} matter={matter} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatterCard({ matter }: { matter: LitigationMatter }) {
  const creditorName = matter.liability?.current_creditor?.name || 
                       matter.liability?.original_creditor?.name || 
                       'Unknown Creditor';
  
  const isOverdue = matter.response_deadline && isPast(new Date(matter.response_deadline)) && 
                    matter.status === 'pending_response';

  return (
    <Card className={isOverdue ? 'border-red-300' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">
                {matter.case_number || 'Case # Pending'}
              </h4>
              <Badge className={statusBadgeColors[matter.status]}>
                {statusLabels[matter.status]}
              </Badge>
              {isOverdue && (
                <Badge className="bg-red-500 text-white">Overdue</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {creditorName}
              {matter.liability?.liability_type && (
                <span className="ml-1">
                  ({typeLabels[matter.liability.liability_type] || matter.liability.liability_type})
                </span>
              )}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{formatCurrency(matter.liability?.current_balance)}</p>
            <p className="text-muted-foreground">Balance</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {matter.court_name && (
            <div>
              <p className="text-muted-foreground">Court</p>
              <p className="font-medium truncate">{matter.court_name}</p>
            </div>
          )}
          {matter.opposing_party && (
            <div>
              <p className="text-muted-foreground">Opposing Party</p>
              <p className="font-medium truncate">{matter.opposing_party}</p>
            </div>
          )}
          {matter.service_date && (
            <div>
              <p className="text-muted-foreground">Service Date</p>
              <p className="font-medium">{format(new Date(matter.service_date), 'MMM d, yyyy')}</p>
            </div>
          )}
          {matter.response_deadline && (
            <div>
              <p className="text-muted-foreground">Response Due</p>
              <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                {format(new Date(matter.response_deadline), 'MMM d, yyyy')}
              </p>
            </div>
          )}
        </div>

        {matter.notes && (
          <p className="mt-3 text-sm text-muted-foreground border-t pt-3">
            {matter.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}