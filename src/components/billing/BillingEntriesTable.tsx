import { useState } from 'react';
import { format } from 'date-fns';
import { Clock, DollarSign, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useBillingEntries, useDeleteBillingEntry } from '@/hooks/useBillingEntries';
import { BillingEntryFormDialog } from './BillingEntryFormDialog';
import type { BillingEntry } from '@/types/billing';
import {
  BILLING_ENTRY_STATUS_LABELS,
  BILLING_ENTRY_STATUS_COLORS,
  formatDuration,
} from '@/types/billing';

interface BillingEntriesTableProps {
  clientId?: string;
  litigationMatterId?: string;
  staffId?: string;
  showClient?: boolean;
  showMatter?: boolean;
}

export function BillingEntriesTable({
  clientId,
  litigationMatterId,
  staffId,
  showClient = true,
  showMatter = true,
}: BillingEntriesTableProps) {
  const { data: entries, isLoading } = useBillingEntries({
    clientId,
    litigationMatterId,
    staffId,
    realtime: true,
  });
  const deleteEntry = useDeleteBillingEntry();
  const [editingEntry, setEditingEntry] = useState<BillingEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<BillingEntry | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleDelete = async () => {
    if (deletingEntry) {
      await deleteEntry.mutateAsync(deletingEntry.id);
      setDeletingEntry(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!entries?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No billing entries found.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Attorney</TableHead>
            {showClient && <TableHead>Client</TableHead>}
            {showMatter && <TableHead>Matter</TableHead>}
            <TableHead>Duration</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(entry.billing_date), 'MM/dd/yyyy')}
              </TableCell>
              <TableCell>
                {entry.entry_type === 'time' ? (
                  <span className="flex items-center gap-1 text-primary">
                    <Clock className="h-3 w-3" />
                    Time
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-accent-foreground">
                    <DollarSign className="h-3 w-3" />
                    Expense
                  </span>
                )}
              </TableCell>
              <TableCell className="max-w-[200px] truncate" title={entry.description}>
                {entry.description}
                {!entry.is_billable && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Non-billable
                  </Badge>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {entry.staff?.first_name} {entry.staff?.last_name}
              </TableCell>
              {showClient && (
                <TableCell className="whitespace-nowrap">
                  {entry.client ? (
                    `${entry.client.first_name} ${entry.client.last_name}`
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
              {showMatter && (
                <TableCell className="whitespace-nowrap">
                  {entry.litigation_matter?.case_number || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
              <TableCell className="whitespace-nowrap">
                {entry.duration_minutes ? (
                  formatDuration(entry.duration_minutes)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap font-medium">
                {formatCurrency(Number(entry.total_amount))}
              </TableCell>
              <TableCell>
                <Badge className={BILLING_ENTRY_STATUS_COLORS[entry.status]}>
                  {BILLING_ENTRY_STATUS_LABELS[entry.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingEntry(entry)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {entry.status === 'draft' && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeletingEntry(entry)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <BillingEntryFormDialog
        open={!!editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
        entry={editingEntry}
      />

      <AlertDialog open={!!deletingEntry} onOpenChange={(open) => !open && setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Billing Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this billing entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
