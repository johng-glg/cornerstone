import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useTransactionsForClient } from '@/hooks/useClientData';
import { TransactionDetailSheet } from '@/components/payments/TransactionDetailSheet';

interface ClientPaymentsTabProps {
  clientId: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  completed: 'bg-green-500/10 text-green-700 border-green-200',
  failed: 'bg-red-500/10 text-red-700 border-red-200',
  cancelled: 'bg-gray-500/10 text-gray-700 border-gray-200',
  processing: 'bg-blue-500/10 text-blue-700 border-blue-200',
};

const typeLabels: Record<string, string> = {
  payment: 'Payment',
  refund: 'Refund',
  fee: 'Fee',
  settlement: 'Settlement',
  adjustment: 'Adjustment',
};

export function ClientPaymentsTab({ clientId }: ClientPaymentsTabProps) {
  const { data: transactions, isLoading } = useTransactionsForClient(clientId);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No transactions found for this client.
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Processor</TableHead>
              <TableHead>Service</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedTransactionId(transaction.id)}
              >
                <TableCell>
                  {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {typeLabels[transaction.transaction_type] || transaction.transaction_type}
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[transaction.status] || ''}>
                    {transaction.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {transaction.processor?.name || '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {transaction.client_service?.service_number || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TransactionDetailSheet
        transactionId={selectedTransactionId}
        open={!!selectedTransactionId}
        onOpenChange={(open) => !open && setSelectedTransactionId(null)}
      />
    </>
  );
}
