import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BillingEntriesTable } from '@/components/billing/BillingEntriesTable';
import { BillingSummaryCard } from '@/components/billing/BillingSummaryCard';
import { BillingEntryFormDialog } from '@/components/billing/BillingEntryFormDialog';

interface ClientBillingTabProps {
  clientId: string;
}

export function ClientBillingTab({ clientId }: ClientBillingTabProps) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Billing & Time Entries</h3>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Entry
        </Button>
      </div>

      <BillingSummaryCard clientId={clientId} />

      <BillingEntriesTable
        clientId={clientId}
        showClient={false}
        showMatter={true}
      />

      <BillingEntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultClientId={clientId}
      />
    </div>
  );
}
