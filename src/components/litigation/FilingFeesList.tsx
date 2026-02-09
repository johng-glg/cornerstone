import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, DollarSign, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFilingFees, useDeleteFilingFee, type FilingFee } from '@/hooks/useFilingFees';
import { FilingFeeFormDialog } from './FilingFeeFormDialog';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  submitted_to_client: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  paid: 'bg-emerald-100 text-emerald-800',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  submitted_to_client: 'Submitted to Client',
  approved: 'Approved',
  declined: 'Declined',
  paid: 'Paid',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

interface FilingFeesListProps {
  matterId: string;
}

export function FilingFeesList({ matterId }: FilingFeesListProps) {
  const { data: fees, isLoading } = useFilingFees(matterId);
  const deleteFee = useDeleteFilingFee();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FilingFee | null>(null);

  const handleEdit = (fee: FilingFee) => {
    setEditingFee(fee);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingFee(null);
    setDialogOpen(true);
  };

  const totalAmount = fees?.reduce((sum, f) => sum + Number(f.amount), 0) ?? 0;
  const approvedAmount = fees?.filter(f => f.status === 'approved' || f.status === 'paid').reduce((sum, f) => sum + Number(f.amount), 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Filing Fees
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Total: {formatCurrency(totalAmount)} · Approved/Paid: {formatCurrency(approvedAmount)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Fee
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>
      ) : fees && fees.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{fee.description}</p>
                    {fee.notes && <p className="text-xs text-muted-foreground">{fee.notes}</p>}
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(Number(fee.amount))}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[fee.status]}>{statusLabels[fee.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(fee.requested_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(fee)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteFee.mutate({ id: fee.id, matterId })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
          <DollarSign className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No filing fees recorded</p>
        </div>
      )}

      <FilingFeeFormDialog
        matterId={matterId}
        fee={editingFee}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingFee(null);
        }}
      />
    </div>
  );
}
