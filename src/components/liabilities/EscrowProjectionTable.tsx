import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import type { MonthlyProjection } from '@/types/escrow';
import { cn } from '@/lib/utils';

interface EscrowProjectionTableProps {
  projections: MonthlyProjection[];
  maxRows?: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

const statusConfig = {
  ok: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'OK',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    label: 'Low',
  },
  danger: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    label: 'Danger',
  },
  negative: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: 'Negative',
  },
};

export function EscrowProjectionTable({ projections, maxRows = 12 }: EscrowProjectionTableProps) {
  const displayedProjections = projections.slice(0, maxRows);
  const hasNegative = projections.some(p => p.status === 'negative');
  
  return (
    <div className="space-y-2">
      {hasNegative && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
          <XCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive font-medium">
            This settlement would cause negative escrow balance
          </span>
        </div>
      )}
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">Month</TableHead>
              <TableHead className="text-right">Draft In</TableHead>
              <TableHead className="text-right">Settlement</TableHead>
              <TableHead className="text-right">Fees</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-[80px] text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedProjections.map((projection, index) => {
              const config = statusConfig[projection.status];
              const Icon = config.icon;
              
              return (
                <TableRow 
                  key={projection.label}
                  className={cn(
                    projection.status === 'negative' && 'bg-red-50/50',
                    projection.status === 'danger' && 'bg-orange-50/30',
                    projection.status === 'warning' && 'bg-yellow-50/30'
                  )}
                >
                  <TableCell className="font-medium">{projection.label}</TableCell>
                  <TableCell className="text-right text-green-600">
                    +{formatCurrency(projection.draftIn)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {projection.settlementOut > 0 ? `-${formatCurrency(projection.settlementOut)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    -{formatCurrency(projection.processorFee + projection.contingencyFee)}
                  </TableCell>
                  <TableCell className={cn(
                    'text-right font-semibold',
                    projection.balance < 0 ? 'text-red-600' : 'text-foreground'
                  )}>
                    {formatCurrency(projection.balance)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant="outline" 
                      className={cn('gap-1', config.color, config.bgColor, 'border-0')}
                    >
                      <Icon className="h-3 w-3" />
                      <span className="sr-only">{config.label}</span>
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {projections.length > maxRows && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {maxRows} of {projections.length} months
        </p>
      )}
    </div>
  );
}
