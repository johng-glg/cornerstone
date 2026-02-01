import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Calendar, Hash, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { useTransaction } from '@/hooks/useTransactions';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface TransactionDetailSheetProps {
  transactionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusBadgeColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-purple-100 text-purple-800',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export function TransactionDetailSheet({ transactionId, open, onOpenChange }: TransactionDetailSheetProps) {
  const { data: transaction, isLoading } = useTransaction(transactionId || undefined);

  return (
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
                      External Reference
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {transaction.external_id}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Error Message */}
              {transaction.error_message && (
                <Card className="border-destructive">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Error
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-destructive">{transaction.error_message}</p>
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
  );
}
