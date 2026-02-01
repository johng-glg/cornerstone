import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiabilitiesForClient } from '@/hooks/useClientData';
import { useLiability } from '@/hooks/useLiabilities';
import { LiabilityDetailSheet } from '@/components/liabilities/LiabilityDetailSheet';
import { LiabilityFormDialog } from '@/components/liabilities/LiabilityFormDialog';

interface ClientLiabilitiesTabProps {
  clientId: string;
}

const formatCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—';

const statusColors: Record<string, string> = {
  enrolled: 'bg-blue-500/10 text-blue-700 border-blue-200',
  in_negotiation: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  settled: 'bg-green-500/10 text-green-700 border-green-200',
  in_litigation: 'bg-red-500/10 text-red-700 border-red-200',
  dismissed: 'bg-gray-500/10 text-gray-700 border-gray-200',
  cancelled: 'bg-gray-500/10 text-gray-700 border-gray-200',
};

const typeLabels: Record<string, string> = {
  credit_card: 'Credit Card',
  medical: 'Medical',
  personal_loan: 'Personal Loan',
  auto_loan: 'Auto Loan',
  student_loan: 'Student Loan',
  mortgage: 'Mortgage',
  other: 'Other',
};

export function ClientLiabilitiesTab({ clientId }: ClientLiabilitiesTabProps) {
  const { data: liabilities, isLoading } = useLiabilitiesForClient(clientId);
  const [selectedLiabilityId, setSelectedLiabilityId] = useState<string | null>(null);
  const [editingLiabilityId, setEditingLiabilityId] = useState<string | null>(null);
  
  // Fetch the full liability data for editing
  const { data: editingLiability } = useLiability(editingLiabilityId || undefined);

  const handleEdit = () => {
    // Transfer from detail view to edit mode
    if (selectedLiabilityId) {
      setEditingLiabilityId(selectedLiabilityId);
      setSelectedLiabilityId(null);
    }
  };

  const handleEditDialogClose = (open: boolean) => {
    if (!open) {
      setEditingLiabilityId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!liabilities || liabilities.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No liabilities found for this client.
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Creditor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Enrolled Balance</TableHead>
              <TableHead>Current Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Service</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liabilities.map((liability) => (
              <TableRow
                key={liability.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedLiabilityId(liability.id)}
              >
                <TableCell className="font-medium">
                  {liability.current_creditor?.name || liability.original_creditor?.name || 'Unknown'}
                </TableCell>
                <TableCell>
                  {typeLabels[liability.liability_type] || liability.liability_type}
                </TableCell>
                <TableCell>{formatCurrency(liability.enrolled_balance)}</TableCell>
                <TableCell>{formatCurrency(liability.current_balance)}</TableCell>
                <TableCell>
                  <Badge className={statusColors[liability.status] || ''}>
                    {liability.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {liability.client_service?.service_number || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <LiabilityDetailSheet
        liabilityId={selectedLiabilityId}
        open={!!selectedLiabilityId}
        onOpenChange={(open) => !open && setSelectedLiabilityId(null)}
        onEdit={handleEdit}
      />

      <LiabilityFormDialog
        open={!!editingLiabilityId}
        onOpenChange={handleEditDialogClose}
        liability={editingLiability}
      />
    </>
  );
}
