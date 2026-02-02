import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, DollarSign, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiabilities, type Liability, type LiabilityStatus, type LiabilityType } from '@/hooks/useLiabilities';
import { LiabilityFormDialog } from '@/components/liabilities/LiabilityFormDialog';
import { LiabilityDetailSheet } from '@/components/liabilities/LiabilityDetailSheet';
import { format } from 'date-fns';

const statusBadgeColors: Record<string, string> = {
  enrolled: 'bg-blue-100 text-blue-800',
  in_negotiation: 'bg-yellow-100 text-yellow-800',
  settled: 'bg-green-100 text-green-800',
  in_litigation: 'bg-red-100 text-red-800',
  dismissed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-400',
};

const statusLabels: Record<string, string> = {
  enrolled: 'Enrolled',
  in_negotiation: 'In Negotiation',
  settled: 'Settled',
  in_litigation: 'In Litigation',
  dismissed: 'Dismissed',
  cancelled: 'Cancelled',
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

const maskAccountNumber = (num: string | null) =>
  num ? `****${num.slice(-4)}` : 'N/A';

export default function LiabilitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LiabilityStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<LiabilityType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedLiabilityId, setSelectedLiabilityId] = useState<string | null>(null);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);

  // Handle ?open=id query param to auto-open detail sheet
  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId) {
      setSelectedLiabilityId(openId);
      searchParams.delete('open');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: liabilities, isLoading } = useLiabilities(
    statusFilter === 'all' ? undefined : statusFilter,
    typeFilter === 'all' ? undefined : typeFilter
  );

  // Filter by search (client name or service number)
  const filteredLiabilities = liabilities?.filter((l) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const clientName = `${l.client_service?.primary_client?.first_name || ''} ${l.client_service?.primary_client?.last_name || ''}`.toLowerCase();
    const svcNum = l.client_service?.service_number?.toLowerCase() || '';
    const creditorName = l.current_creditor?.name?.toLowerCase() || l.original_creditor?.name?.toLowerCase() || '';
    return clientName.includes(searchLower) || svcNum.includes(searchLower) || creditorName.includes(searchLower);
  });

  const handleViewLiability = (liability: Liability) => {
    setSelectedLiabilityId(liability.id);
  };

  const handleEditLiability = (liability: Liability) => {
    setEditingLiability(liability);
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Liabilities</h1>
          <p className="text-muted-foreground">Manage debts and settlement negotiations</p>
        </div>
        <Button onClick={() => { setEditingLiability(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Liability
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client, service, creditor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LiabilityStatus | 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as LiabilityType | 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(typeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liabilities Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Client / Service</TableHead>
              <TableHead>Creditor</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Current Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                </TableRow>
              ))
            ) : filteredLiabilities && filteredLiabilities.length > 0 ? (
              filteredLiabilities.map((liability) => (
                <TableRow
                  key={liability.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewLiability(liability)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{typeLabels[liability.liability_type]}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {liability.client_service?.primary_client?.first_name} {liability.client_service?.primary_client?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {liability.client_service?.service_number}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {liability.current_creditor?.name || liability.original_creditor?.name || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">
                    {maskAccountNumber(liability.account_number)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(liability.current_balance)}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadgeColors[liability.status]}>
                      {statusLabels[liability.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(liability.created_at), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {search || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'No liabilities match your filters' 
                    : 'No liabilities yet. Add your first liability!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <LiabilityFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        liability={editingLiability}
      />

      {/* Detail Sheet */}
      <LiabilityDetailSheet
        liabilityId={selectedLiabilityId}
        open={!!selectedLiabilityId}
        onOpenChange={(open) => !open && setSelectedLiabilityId(null)}
        onEdit={() => {
          const liability = liabilities?.find((l) => l.id === selectedLiabilityId);
          if (liability) {
            setSelectedLiabilityId(null);
            handleEditLiability(liability);
          }
        }}
      />
    </div>
  );
}
