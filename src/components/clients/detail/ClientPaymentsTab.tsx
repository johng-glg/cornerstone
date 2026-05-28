import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useTransactionsForClient } from '@/hooks/useClientData';
import { TransactionDetailSheet } from '@/components/payments/TransactionDetailSheet';
import { EscrowBalanceChart } from './EscrowBalanceChart';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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
  open: 'bg-blue-500/10 text-blue-700 border-blue-200',
  cleared: 'bg-green-500/10 text-green-700 border-green-200',
};

const typeLabels: Record<string, string> = {
  payment: 'Payment',
  refund: 'Refund',
  fee: 'Fee',
  settlement: 'Settlement',
  adjustment: 'Adjustment',
  draft: 'Draft',
  processor_fee: 'Processor Fee',
  settlement_payment: 'Settlement Payment',
  contingency_fee: 'Contingency Fee',
};

type SortField = 'date' | 'type' | 'amount' | 'status' | 'balance';
type SortDirection = 'asc' | 'desc';

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

export function ClientPaymentsTab({ clientId }: ClientPaymentsTabProps) {
  const { data: transactions, isLoading } = useTransactionsForClient(clientId);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
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

  // Calculate running balance for each transaction
  const transactionsWithBalance = useMemo(() => {
    if (!transactions) return [];
    
    // Sort by date first to calculate running balance
    const sorted = [...transactions].sort((a, b) => {
      const dateA = new Date(a.scheduled_date || a.created_at).getTime();
      const dateB = new Date(b.scheduled_date || b.created_at).getTime();
      return dateA - dateB;
    });
    
    // Calculate running balance
    let runningBalance = 0;
    const withBalance = sorted.map(t => {
      if (t.status !== 'cancelled') {
        if (t.transaction_type === 'draft') {
          runningBalance += t.amount;
        } else {
          runningBalance -= t.amount;
        }
      }
      return { ...t, runningBalance };
    });
    
    return withBalance;
  }, [transactions]);

  const sortedTransactions = useMemo(() => {
    if (!transactionsWithBalance.length) return [];
    
    return [...transactionsWithBalance].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.scheduled_date || a.created_at).getTime() - new Date(b.scheduled_date || b.created_at).getTime();
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
        case 'balance':
          comparison = a.runningBalance - b.runningBalance;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [transactionsWithBalance, sortField, sortDirection]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
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
    <div className="space-y-6">
      {/* PLSA Balance Chart */}
      <EscrowBalanceChart transactions={transactions} />

      {/* Transactions Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="date" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
                Date
              </SortableHeader>
              <SortableHeader field="type" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
                Type
              </SortableHeader>
              <SortableHeader field="amount" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
                Amount
              </SortableHeader>
              <SortableHeader field="status" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
                Status
              </SortableHeader>
              <SortableHeader field="balance" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort}>
                Balance
              </SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTransactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedTransactionId(transaction.id)}
              >
                <TableCell>
                  {format(new Date(transaction.scheduled_date || transaction.created_at), 'MMM d, yyyy')}
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
                <TableCell className={`font-medium ${transaction.runningBalance < 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(transaction.runningBalance)}
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
    </div>
  );
}
