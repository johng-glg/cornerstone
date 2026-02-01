import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { TransactionForClient } from '@/hooks/useClientData';

interface EscrowBalanceChartProps {
  transactions: TransactionForClient[] | undefined;
  currentEscrowBalance?: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function EscrowBalanceChart({ transactions, currentEscrowBalance = 0 }: EscrowBalanceChartProps) {
  const { projectionData, summary } = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { projectionData: [], summary: { totalInflow: 0, totalOutflow: 0, projectedPeak: 0 } };
    }

    // Sort transactions by scheduled_date or created_at
    const sorted = [...transactions].sort((a, b) => {
      const dateA = new Date(a.scheduled_date || a.created_at).getTime();
      const dateB = new Date(b.scheduled_date || b.created_at).getTime();
      return dateA - dateB;
    });

    // Group by month and calculate running balance
    const monthlyMap = new Map<string, { inflow: number; outflow: number; transactions: TransactionForClient[] }>();
    
    sorted.forEach((t) => {
      const date = new Date(t.scheduled_date || t.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { inflow: 0, outflow: 0, transactions: [] });
      }
      
      const data = monthlyMap.get(monthKey)!;
      data.transactions.push(t);
      
      // Drafts are inflows, everything else is outflow
      if (t.transaction_type === 'draft') {
        data.inflow += t.amount;
      } else {
        data.outflow += t.amount;
      }
    });

    // Convert to array and calculate running balance
    let runningBalance = currentEscrowBalance;
    let totalInflow = 0;
    let totalOutflow = 0;
    let projectedPeak = currentEscrowBalance;
    
    // Find the earliest cleared transaction to start from there
    const clearedTransactions = sorted.filter(t => t.status === 'cleared');
    const firstClearedDate = clearedTransactions.length > 0 
      ? new Date(clearedTransactions[0].scheduled_date || clearedTransactions[0].created_at)
      : new Date();
    
    // Calculate what the balance was before the first transaction
    // We need to work backwards from current balance
    let historicalBalance = currentEscrowBalance;
    sorted.forEach(t => {
      if (t.status === 'cleared') {
        if (t.transaction_type === 'draft') {
          historicalBalance -= t.amount;
        } else {
          historicalBalance += t.amount;
        }
      }
    });
    
    runningBalance = historicalBalance;

    const projectionData = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        
        // Apply transactions for this month
        data.transactions.forEach(t => {
          // Only count non-cancelled transactions
          if (t.status !== 'cancelled') {
            if (t.transaction_type === 'draft') {
              runningBalance += t.amount;
              totalInflow += t.amount;
            } else {
              runningBalance -= t.amount;
              totalOutflow += t.amount;
            }
          }
        });
        
        projectedPeak = Math.max(projectedPeak, runningBalance);
        
        const now = new Date();
        const isFuture = date > now;
        
        return {
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          monthKey: key,
          balance: Math.round(runningBalance),
          inflow: data.inflow,
          outflow: data.outflow,
          isFuture,
        };
      });

    return { 
      projectionData, 
      summary: { totalInflow, totalOutflow, projectedPeak } 
    };
  }, [transactions, currentEscrowBalance]);

  if (!transactions || transactions.length === 0) {
    return null;
  }

  // Find current month index for reference line
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthData = projectionData.find(d => d.monthKey === currentMonthKey);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Current Balance</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(currentEscrowBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Total Drafts</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(summary.totalInflow)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-muted-foreground">Total Outflow</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-600">{formatCurrency(summary.totalOutflow)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Projected Peak</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summary.projectedPeak)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Projected Escrow Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'balance' ? 'Balance' : name
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                {currentMonthData && (
                  <ReferenceLine 
                    x={currentMonthData.month} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                    label={{ 
                      value: 'Today', 
                      position: 'top', 
                      fontSize: 11,
                      fill: 'hsl(var(--muted-foreground))'
                    }}
                  />
                )}
                <ReferenceLine 
                  y={0} 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone"
                  dataKey="balance" 
                  name="Balance"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
