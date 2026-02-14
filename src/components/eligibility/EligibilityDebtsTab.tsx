import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface EligibilityDebtsTabProps {
  leadId: string;
}

function useLeadDebts(leadId: string) {
  return useQuery({
    queryKey: ['lead-debts', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_debts')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!leadId,
  });
}

export function EligibilityDebtsTab({ leadId }: EligibilityDebtsTabProps) {
  const { data: debts, isLoading } = useLeadDebts(leadId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (!debts || debts.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">
        No debts recorded for this lead.
      </div>
    );
  }

  const totalOriginal = debts.reduce((sum, d) => sum + (d.original_balance || 0), 0);
  const totalCurrent = debts.reduce((sum, d) => sum + (d.current_balance || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Total Original:</span>{' '}
          <span className="font-medium">${totalOriginal.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Total Current:</span>{' '}
          <span className="font-medium">${totalCurrent.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Count:</span>{' '}
          <span className="font-medium">{debts.length}</span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Creditor</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Original</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead>Enrolled</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {debts.map((debt) => (
            <TableRow key={debt.id}>
              <TableCell className="font-medium">
                {debt.creditor_name || '—'}
                {debt.account_number_last4 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ···{debt.account_number_last4}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize text-xs">
                  {(debt.account_type || '—').replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-sm">
                {debt.original_balance ? `$${debt.original_balance.toLocaleString()}` : '—'}
              </TableCell>
              <TableCell className="text-right text-sm">
                {debt.current_balance ? `$${debt.current_balance.toLocaleString()}` : '—'}
              </TableCell>
              <TableCell>
                <Badge variant={debt.is_enrolled ? 'default' : 'secondary'}>
                  {debt.is_enrolled ? 'Yes' : 'No'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
