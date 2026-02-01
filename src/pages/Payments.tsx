import { useState } from 'react';
import { Search, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTransactions, type Transaction } from '@/hooks/useTransactions';
import { TransactionList } from '@/components/payments/TransactionList';
import { TransactionDetailSheet } from '@/components/payments/TransactionDetailSheet';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'payment', label: 'Payment' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'refund', label: 'Refund' },
  { value: 'fee', label: 'Fee' },
];

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  const { data: transactions, isLoading } = useTransactions(
    statusFilter === 'all' ? undefined : statusFilter,
    typeFilter === 'all' ? undefined : typeFilter
  );

  // Filter by search (engagement number or client name)
  const filteredTransactions = transactions?.filter((t) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const clientName = `${t.engagement?.primary_contact?.first_name || ''} ${t.engagement?.primary_contact?.last_name || ''}`.toLowerCase();
    const engNum = t.engagement?.engagement_number?.toLowerCase() || '';
    const externalId = t.external_id?.toLowerCase() || '';
    return clientName.includes(searchLower) || engNum.includes(searchLower) || externalId.includes(searchLower);
  });

  const handleSelectTransaction = (transaction: Transaction) => {
    setSelectedTransactionId(transaction.id);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Payments
          </h1>
          <p className="text-muted-foreground">View and manage transaction history</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client, engagement, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <div className="border rounded-lg">
        <TransactionList
          transactions={filteredTransactions}
          isLoading={isLoading}
          onSelect={handleSelectTransaction}
          emptyMessage={
            search || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'No transactions match your filters'
              : 'No transactions yet'
          }
        />
      </div>

      {/* Detail Sheet */}
      <TransactionDetailSheet
        transactionId={selectedTransactionId}
        open={!!selectedTransactionId}
        onOpenChange={(open) => !open && setSelectedTransactionId(null)}
      />
    </div>
  );
}
