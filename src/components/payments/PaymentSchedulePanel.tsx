import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, DollarSign, Play, Pause, Settings, Plus, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useScheduleSummary, usePausePaymentSchedule } from '@/hooks/usePaymentSchedule';
import { FREQUENCY_LABELS } from '@/types/paymentSchedule';
import { PaymentScheduleDialog } from './PaymentScheduleDialog';
import { UpcomingDraftsList } from './UpcomingDraftsList';

interface PaymentSchedulePanelProps {
  clientServiceId: string;
  termMonths?: number | null;
  totalEnrolledDebt?: number | null;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 border-green-200',
  paused: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  completed: 'bg-blue-500/10 text-blue-700 border-blue-200',
  cancelled: 'bg-red-500/10 text-red-700 border-red-200',
};

export function PaymentSchedulePanel({ 
  clientServiceId, 
  termMonths, 
  totalEnrolledDebt 
}: PaymentSchedulePanelProps) {
  const { data: summary, isLoading, refetch } = useScheduleSummary(clientServiceId);
  const pauseSchedule = usePausePaymentSchedule();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showModifyDialog, setShowModifyDialog] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Payment Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No schedule exists yet
  if (!summary) {
    return (
      <>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Payment Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                No payment schedule configured for this service.
              </p>
              <Button onClick={() => setShowCreateDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create Schedule
              </Button>
            </div>
          </CardContent>
        </Card>

        <PaymentScheduleDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          clientServiceId={clientServiceId}
          termMonths={termMonths}
          totalEnrolledDebt={totalEnrolledDebt}
        />
      </>
    );
  }

  const handleTogglePause = () => {
    pauseSchedule.mutate({
      id: summary.id,
      pause: summary.status === 'active',
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Payment Schedule
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[summary.status]}>
                {summary.status}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {summary.draftsCleared} of {summary.totalDrafts} drafts ({summary.progressPercentage}%)
              </span>
            </div>
            <Progress value={summary.progressPercentage} className="h-2" />
          </div>

          {/* Schedule Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Draft Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(summary.draftAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Frequency</p>
              <p className="font-medium">{FREQUENCY_LABELS[summary.frequency]}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Draft</p>
              <p className="font-medium">
                {summary.nextDraftDate 
                  ? format(summary.nextDraftDate, 'MMM d, yyyy')
                  : 'None scheduled'}
              </p>
              {summary.nextDraftDate && (
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(summary.nextDraftDate, { addSuffix: true })}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Est. Completion</p>
              <p className="font-medium">
                {format(summary.estimatedCompletionDate, 'MMM yyyy')}
              </p>
            </div>
          </div>

          {/* Draft Status Summary */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Cleared:</span>
              <span className="font-medium">{summary.draftsCleared}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">Pending:</span>
              <span className="font-medium">{summary.draftsPending}</span>
            </div>
            {summary.draftsCancelled > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-muted-foreground">Skipped:</span>
                <span className="font-medium">{summary.draftsCancelled}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {summary.status !== 'completed' && summary.status !== 'cancelled' && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePause}
                disabled={pauseSchedule.isPending}
              >
                {summary.status === 'paused' ? (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Pause
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModifyDialog(true)}
              >
                <Settings className="h-3 w-3 mr-1" />
                Modify
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Drafts List */}
      <UpcomingDraftsList clientServiceId={clientServiceId} />

      {/* Modify Dialog */}
      <PaymentScheduleDialog
        open={showModifyDialog}
        onOpenChange={setShowModifyDialog}
        clientServiceId={clientServiceId}
        existingSchedule={summary}
        termMonths={termMonths}
        totalEnrolledDebt={totalEnrolledDebt}
      />
    </>
  );
}
