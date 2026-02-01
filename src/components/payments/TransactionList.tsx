import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, ArrowUpRight, ArrowDownLeft, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { type Transaction } from '@/hooks/useTransactions';
import { format } from 'date-fns';

interface TransactionListProps {
  transactions: Transaction[] | undefined;
  isLoading: boolean;
  onSelect?: (transaction: Transaction) => void;
  emptyMessage?: string;
}

type SortField = 'date' | 'service' | 'type' | 'amount' | 'status' | 'processor';
type SortDirection = 'asc' | 'desc';

const statusBadgeColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-purple-100 text-purple-800',
  open: 'bg-blue-100 text-blue-800',
  cleared: 'bg-green-100 text-green-800',
};

const typeIcons: Record<string, React.ReactNode> = {
  payment: <ArrowDownLeft className="h-4 w-4" />,
  withdrawal: <ArrowUpRight className="h-4 w-4" />,
  refund: <RefreshCw className="h-4 w-4" />,
  draft: <ArrowDownLeft className="h-4 w-4" />,
  processor_fee: <CreditCard className="h-4 w-4" />,
  settlement_payment: <ArrowUpRight className="h-4 w-4" />,
  contingency_fee: <ArrowUpRight className="h-4 w-4" />,
  default: <CreditCard className="h-4 w-4" />,
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

function SortableHeader({ 
  field, 
  currentSort, 
  currentDirection, 
  onSort, 
  children,
  className = ''
}: { 
  field: SortField; 
  currentSort: SortField; 
  currentDirection: SortDirection; 
  onSort: (field: SortField) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const isActive = currentSort === field;
  return (
    <TableHead 
      className={`cursor-pointer select-none hover:bg-muted/50 ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          currentDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );
}

export function TransactionList({ 
  transactions, 
  isLoading, 
  onSelect,
  emptyMessage = 'No transactions found'
}: TransactionListProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return [...transactions].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.scheduled_date || a.created_at).getTime() - new Date(b.scheduled_date || b.created_at).getTime();
          break;
        case 'service':
          comparison = (a.client_service?.service_number || '').localeCompare(b.client_service?.service_number || '');
          break;
        case 'type':
          comparison = a.transaction_type.localeCompare(b.transaction_type);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'processor':
          comparison = (a.processor?.name || '').localeCompare(b.processor?.name || '');
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [transactions, sortField, sortDirection]);

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Service</TableHead>
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
          <SortableHeader field="date" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
            Date
          </SortableHeader>
          <SortableHeader field="service" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
            Service
          </SortableHeader>
          <SortableHeader field="type" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
            Type
          </SortableHeader>
          <SortableHeader field="amount" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-right">
            Amount
          </SortableHeader>
          <SortableHeader field="status" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
            Status
          </SortableHeader>
          <SortableHeader field="processor" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
            Processor
          </SortableHeader>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedTransactions.length > 0 ? (
          sortedTransactions.map((transaction) => (
            <TableRow
              key={transaction.id}
              className={onSelect ? "cursor-pointer hover:bg-muted/50" : ""}
              onClick={() => onSelect?.(transaction)}
            >
              <TableCell className="text-sm">
                {format(new Date(transaction.scheduled_date || transaction.created_at), 'MMM d, yyyy')}
                <span className="text-muted-foreground block text-xs">
                  {format(new Date(transaction.scheduled_date || transaction.created_at), 'h:mm a')}
                </span>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">
                    {transaction.client_service?.service_number || 'N/A'}
                  </p>
                  {transaction.client_service?.primary_client && (
                    <p className="text-xs text-muted-foreground">
                      {transaction.client_service.primary_client.first_name} {transaction.client_service.primary_client.last_name}
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
