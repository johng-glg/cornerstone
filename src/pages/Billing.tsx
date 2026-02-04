import { useState } from 'react';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BillingEntriesTable } from '@/components/billing/BillingEntriesTable';
import { BillingEntryFormDialog } from '@/components/billing/BillingEntryFormDialog';
import { useBillingEntries, useBillingSummary } from '@/hooks/useBillingEntries';
import { useClients } from '@/hooks/useClients';
import { useLitigationMatters } from '@/hooks/useLitigationMatters';
import { useStaff } from '@/hooks/useStaff';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, DollarSign, Receipt, CheckCircle } from 'lucide-react';
import {
  BILLING_ENTRY_STATUS_LABELS,
  type BillingEntryStatus,
} from '@/types/billing';

export default function BillingPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedMatterId, setSelectedMatterId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const { data: clientsData } = useClients({ pageSize: 500 });
  const { data: matters } = useLitigationMatters();
  const { data: staffList } = useStaff('legal');

  // Build filter options for the entries query
  const filterOptions = {
    clientId: selectedClientId || undefined,
    litigationMatterId: selectedMatterId || undefined,
    staffId: selectedStaffId || undefined,
    status: selectedStatus || undefined,
    realtime: true,
  };

  const { data: entries, isLoading } = useBillingEntries(filterOptions);

  // Get summary for filtered or all entries
  const { data: summary, isLoading: summaryLoading } = useBillingSummary({
    clientId: selectedClientId || undefined,
    litigationMatterId: selectedMatterId || undefined,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const clearFilters = () => {
    setSelectedClientId('');
    setSelectedMatterId('');
    setSelectedStaffId('');
    setSelectedStatus('');
  };

  const hasFilters = selectedClientId || selectedMatterId || selectedStaffId || selectedStatus;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Billing & Time Entries</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track time and expenses for clients and litigation matters
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Billable
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary?.totalBillable || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Time Charges
                  </CardTitle>
                  <Clock className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary?.totalTime || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Expenses
                  </CardTitle>
                  <Receipt className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary?.totalExpenses || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Paid
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary?.byStatus?.paid || 0)}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Client
                </label>
                <Select
                  value={selectedClientId || '__all__'}
                  onValueChange={(val) => setSelectedClientId(val === '__all__' ? '' : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Clients</SelectItem>
                    {clientsData?.data?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.first_name} {client.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Matter
                </label>
                <Select
                  value={selectedMatterId || '__all__'}
                  onValueChange={(val) => setSelectedMatterId(val === '__all__' ? '' : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All matters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Matters</SelectItem>
                    {matters?.map((matter) => (
                      <SelectItem key={matter.id} value={matter.id}>
                        {matter.case_number || matter.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Attorney
                </label>
                <Select
                  value={selectedStaffId || '__all__'}
                  onValueChange={(val) => setSelectedStaffId(val === '__all__' ? '' : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All attorneys" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Attorneys</SelectItem>
                    {staffList?.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Status
                </label>
                <Select
                  value={selectedStatus || '__all__'}
                  onValueChange={(val) => setSelectedStatus(val === '__all__' ? '' : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Statuses</SelectItem>
                    {Object.entries(BILLING_ENTRY_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entries Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Billing Entries
                {entries && (
                  <span className="text-muted-foreground font-normal ml-2">
                    ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <BillingEntriesTable
                clientId={selectedClientId || undefined}
                litigationMatterId={selectedMatterId || undefined}
                staffId={selectedStaffId || undefined}
                showClient={true}
                showMatter={true}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <BillingEntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultClientId={selectedClientId || undefined}
        defaultMatterId={selectedMatterId || undefined}
      />
    </div>
  );
}
