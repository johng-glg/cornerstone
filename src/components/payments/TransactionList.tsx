import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';
import { type Transaction } from '@/hooks/useTransactions';
import { format } from 'date-fns';

interface TransactionListProps {
  transactions: Transaction[] | undefined;
  isLoading: boolean;
  onSelect?: (transaction: Transaction) => void;
  emptyMessage?: string;
}

const statusBadgeColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-purple-100 text-purple-800',
};

const typeIcons: Record<string, React.ReactNode> = {
  payment: <ArrowDownLeft className="h-4 w-4" />,
  withdrawal: <ArrowUpRight className="h-4 w-4" />,
  refund: <RefreshCw className="h-4 w-4" />,
  default: <CreditCard className="h-4 w-4" />,
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export function TransactionList({ 
  transactions, 
  isLoading, 
  onSelect,
  emptyMessage = 'No transactions found'
}: TransactionListProps) {
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Engagement</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Processor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Engagement</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Processor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions && transactions.length > 0 ? (
          transactions.map((transaction) => (
            <TableRow
              key={transaction.id}
              className={onSelect ? "cursor-pointer hover:bg-muted/50" : ""}
              onClick={() => onSelect?.(transaction)}
            >
              <TableCell className="text-sm">
                {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                <span className="text-muted-foreground block text-xs">
                  {format(new Date(transaction.created_at), 'h:mm a')}
                </span>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">
                    {transaction.engagement?.engagement_number || 'N/A'}
                  </p>
                  {transaction.engagement?.primary_contact && (
                    <p className="text-xs text-muted-foreground">
                      {transaction.engagement.primary_contact.first_name} {transaction.engagement.primary_contact.last_name}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                    {typeIcons[transaction.transaction_type] || typeIcons.default}
                  </div>
                  <span className="text-sm capitalize">
                    {transaction.transaction_type.replace('_', ' ')}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(transaction.amount)}
              </TableCell>
              <TableCell>
                <Badge className={statusBadgeColors[transaction.status] || 'bg-gray-100 text-gray-800'}>
                  {transaction.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {transaction.processor?.name || '—'}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
