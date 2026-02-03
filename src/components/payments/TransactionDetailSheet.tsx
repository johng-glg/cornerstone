import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Calendar, Hash, AlertCircle, CheckCircle, Clock, FileText, Upload, XCircle, RefreshCw } from 'lucide-react';
import { useTransaction } from '@/hooks/useTransactions';
import { usePushToForth, useCancelForthDraft, usePollForthTransactions } from '@/hooks/useForthApi';
import { canModifyDraft } from '@/lib/forthApi';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useState } from 'react';
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

interface TransactionDetailSheetProps {
  transactionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusBadgeColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  cleared: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-purple-100 text-purple-800',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export function TransactionDetailSheet({ transactionId, open, onOpenChange }: TransactionDetailSheetProps) {
  const { data: transaction, isLoading } = useTransaction(transactionId || undefined);
  const pushToForth = usePushToForth();
  const cancelForthDraft = useCancelForthDraft();
  const pollTransactions = usePollForthTransactions();
  
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const canPush = transaction?.status === 'open' && !transaction?.external_id;
  const canCancel = transaction?.status === 'pending' && 
    transaction?.external_id && 
    canModifyDraft(transaction?.scheduled_date);
  const isWithinLockWindow = transaction?.scheduled_date && !canModifyDraft(transaction.scheduled_date);

  const handlePushToForth = () => {
    if (transactionId) {
      pushToForth.mutate(transactionId);
    }
  };

  const handleCancelDraft = () => {
    if (transactionId) {
      cancelForthDraft.mutate(transactionId);
      setCancelDialogOpen(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : transaction ? (
            <>
              <SheetHeader className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-xl flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      {formatCurrency(transaction.amount)}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">
                      {transaction.transaction_type.replace('_', ' ')}
                    </p>
                  </div>
                  <Badge className={statusBadgeColors[transaction.status] || 'bg-gray-100 text-gray-800'}>
                    {transaction.status}
                  </Badge>
                </div>
              </SheetHeader>

              <Separator className="my-4" />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {canPush && (
                  <Button 
                    onClick={handlePushToForth}
                    disabled={pushToForth.isPending}
                    size="sm"
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {pushToForth.isPending ? 'Pushing...' : 'Push to Forth'}
                  </Button>
                )}
                
                {canCancel && (
                  <Button 
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={cancelForthDraft.isPending}
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    {cancelForthDraft.isPending ? 'Cancelling...' : 'Cancel Draft'}
                  </Button>
                )}

                {transaction.status === 'pending' && transaction.external_id && (
                  <Button 
                    onClick={() => pollTransactions.mutate()}
                    disabled={pollTransactions.isPending}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${pollTransactions.isPending ? 'animate-spin' : ''}`} />
                    Refresh Status
                  </Button>
                )}
              </div>

              {isWithinLockWindow && transaction.status === 'pending' && (
                <Card className="border-yellow-200 bg-yellow-50 mb-4">
                  <CardContent className="py-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ This draft is within 7 days of processing and cannot be modified.
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {/* Timestamps */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="font-medium">
                          {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    {transaction.scheduled_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Scheduled</p>
                          <p className="font-medium">
                            {format(new Date(transaction.scheduled_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    )}
                    {transaction.processed_at && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Processed</p>
                          <p className="font-medium">
                            {format(new Date(transaction.processed_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    )}
                    {transaction.last_sync_at && (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Last Sync</p>
                          <p className="font-medium">
                            {format(new Date(transaction.last_sync_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Service */}
                {transaction.client_service && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Service
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{transaction.client_service.service_number}</p>
                      {transaction.client_service.primary_client && (
                        <p className="text-sm text-muted-foreground">
                          {transaction.client_service.primary_client.first_name} {transaction.client_service.primary_client.last_name}
                          {transaction.client_service.primary_client.email && (
                            <span className="block">{transaction.client_service.primary_client.email}</span>
                          )}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Processor Info */}
                {transaction.processor && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Payment Processor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Processor</p>
                        <p className="font-medium">{transaction.processor.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="text-sm capitalize">{transaction.processor.processor_type}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* External References */}
                {transaction.external_id && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Forth Pay Reference
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        Draft ID: {transaction.external_id}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Error Message */}
                {(transaction.error_message || transaction.sync_error) && (
                  <Card className="border-destructive">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        Error
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-destructive">{transaction.error_message}</p>
                      {transaction.sync_error && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">Sync Details</summary>
                          <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto max-h-32">
                            {transaction.sync_error}
                          </pre>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Transaction not found</p>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the draft in Forth Pay. The transaction will be marked as cancelled 
              and cannot be reactivated. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Draft</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelDraft} className="bg-destructive text-destructive-foreground">
              Cancel Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
