import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { List, MoreHorizontal, CalendarIcon, XCircle, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useUpcomingTransactions } from '@/hooks/useScheduledTransactions';
import { useSkipDraft, useRescheduleDraft } from '@/hooks/usePaymentSchedule';
import type { Transaction } from '@/hooks/useTransactions';

interface UpcomingDraftsListProps {
  clientServiceId: string;
  limit?: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-700 border-blue-200',
  pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  cleared: 'bg-green-500/10 text-green-700 border-green-200',
  cancelled: 'bg-gray-500/10 text-gray-700 border-gray-200',
};

export function UpcomingDraftsList({ clientServiceId, limit = 6 }: UpcomingDraftsListProps) {
  const { data: transactions, isLoading } = useUpcomingTransactions(clientServiceId, limit);
  const skipDraft = useSkipDraft();
  const rescheduleDraft = useRescheduleDraft();

  const [skipConfirm, setSkipConfirm] = useState<Transaction | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Transaction | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>();

  // Filter to only show drafts (not processor fees)
  const drafts = transactions?.filter(t => t.transaction_type === 'draft') || [];

  const handleSkip = () => {
    if (skipConfirm) {
      skipDraft.mutate(skipConfirm.id);
      setSkipConfirm(null);
    }
  };

  const handleReschedule = () => {
    if (rescheduleTarget && newDate) {
      rescheduleDraft.mutate({ transactionId: rescheduleTarget.id, newDate });
      setRescheduleTarget(null);
      setNewDate(undefined);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <List className="h-4 w-4" />
            Upcoming Drafts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!drafts.length) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <List className="h-4 w-4" />
            Upcoming Drafts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {draft.description || `Draft #${draft.sequence_number}`}
                      </span>
                      <Badge variant="outline" className={statusColors[draft.status]}>
                        {draft.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      {draft.scheduled_date && (
                        <>
                          <span>{format(new Date(draft.scheduled_date), 'MMM d, yyyy')}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(draft.scheduled_date), { addSuffix: true })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatCurrency(draft.amount)}</span>
                  
                  {draft.status === 'open' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setRescheduleTarget(draft)}>
                          <Clock className="h-4 w-4 mr-2" />
                          Reschedule
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setSkipConfirm(draft)}
                          className="text-destructive focus:text-destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Skip Draft
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skip Confirmation Dialog */}
      <AlertDialog open={!!skipConfirm} onOpenChange={() => setSkipConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel {skipConfirm?.description} scheduled for{' '}
              {skipConfirm?.scheduled_date && format(new Date(skipConfirm.scheduled_date), 'MMM d, yyyy')}.
              The associated processor fee will also be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSkip}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Skip Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      <AlertDialog open={!!rescheduleTarget} onOpenChange={() => setRescheduleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reschedule Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Select a new date for {rescheduleTarget?.description}.
              The processor fee will be automatically rescheduled to the following day.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 flex justify-center">
            <Calendar
              mode="single"
              selected={newDate}
              onSelect={setNewDate}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewDate(undefined)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReschedule}
              disabled={!newDate}
            >
              Reschedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
