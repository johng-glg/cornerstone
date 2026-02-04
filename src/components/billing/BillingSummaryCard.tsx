import { Clock, DollarSign, Receipt, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBillingSummary } from '@/hooks/useBillingEntries';

interface BillingSummaryCardProps {
  clientId?: string;
  litigationMatterId?: string;
}

export function BillingSummaryCard({ clientId, litigationMatterId }: BillingSummaryCardProps) {
  const { data: summary, isLoading } = useBillingSummary({
    clientId,
    litigationMatterId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const metrics = [
    {
      title: 'Total Billable',
      value: formatCurrency(summary.totalBillable),
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Time Charges',
      value: formatCurrency(summary.totalTime),
      icon: Clock,
      color: 'text-blue-600',
    },
    {
      title: 'Expenses',
      value: formatCurrency(summary.totalExpenses),
      icon: Receipt,
      color: 'text-orange-600',
    },
    {
      title: 'Paid',
      value: formatCurrency(summary.byStatus.paid),
      icon: CheckCircle,
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
            <metric.icon className={`h-4 w-4 ${metric.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
