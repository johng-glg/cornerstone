import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, DollarSign, AlertCircle, Clock } from 'lucide-react';
import type { Transaction } from '@/hooks/useTransactions';

interface PaymentsSummaryChartProps {
  transactions: Transaction[] | undefined;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function PaymentsSummaryChart({ transactions }: PaymentsSummaryChartProps) {
  const { monthlyData, summary } = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { monthlyData: [], summary: { total: 0, completed: 0, pending: 0, failed: 0 } };
    }

    // Calculate summary stats
    const summary = transactions.reduce(
      (acc, t) => {
        acc.total += t.amount;
        if (t.status === 'completed') acc.completed += t.amount;
        if (t.status === 'pending' || t.status === 'processing') acc.pending += t.amount;
        if (t.status === 'failed') acc.failed += t.amount;
        return acc;
      },
      { total: 0, completed: 0, pending: 0, failed: 0 }
    );

    // Group by month for chart
    const monthlyMap = new Map<string, { payments: number; fees: number; withdrawals: number }>();
    
    transactions.forEach((t) => {
      const date = new Date(t.processed_at || t.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { payments: 0, fees: 0, withdrawals: 0 });
      }
      
      const data = monthlyMap.get(monthKey)!;
      if (t.transaction_type === 'payment') data.payments += t.amount;
      else if (t.transaction_type === 'fee') data.fees += t.amount;
      else if (t.transaction_type === 'withdrawal') data.withdrawals += t.amount;
    });

    // Convert to array and sort
    const monthlyData = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return {
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          ...data,
        };
      });

    return { monthlyData, summary };
  }, [transactions]);

  if (!transactions || transactions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Volume</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summary.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(summary.completed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{formatCurrency(summary.pending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Failed</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{formatCurrency(summary.failed)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Transaction Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="payments" 
                  name="Payments" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="fees" 
                  name="Fees" 
                  fill="hsl(var(--muted-foreground))" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="withdrawals" 
                  name="Withdrawals" 
                  fill="hsl(142 76% 36%)" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
