import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BillingEntriesTable } from '@/components/billing/BillingEntriesTable';
import { BillingSummaryCard } from '@/components/billing/BillingSummaryCard';
import { BillingEntryFormDialog } from '@/components/billing/BillingEntryFormDialog';

interface MatterBillingPanelProps {
  matterId: string;
}

export function MatterBillingPanel({ matterId }: MatterBillingPanelProps) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Billing & Time</h4>
        <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Entry
        </Button>
      </div>

      <BillingSummaryCard litigationMatterId={matterId} />

      <BillingEntriesTable
        litigationMatterId={matterId}
        showClient={true}
        showMatter={false}
      />

      <BillingEntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultMatterId={matterId}
      />
    </div>
  );
}
