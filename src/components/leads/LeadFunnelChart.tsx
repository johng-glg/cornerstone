import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeadSourceMetric } from '@/hooks/useLeadMetrics';

interface LeadFunnelChartProps {
  metrics: LeadSourceMetric[];
}

export function LeadFunnelChart({ metrics }: LeadFunnelChartProps) {
  const funnelData = useMemo(() => {
    const totals = metrics.reduce(
      (acc, m) => ({
        total: acc.total + m.total_leads,
        contacted: acc.contacted + m.contacted_count,
        creditPull: acc.creditPull + m.credit_pull_count,
        qualified: acc.qualified + m.qualified_count,
        converted: acc.converted + m.converted_count,
      }),
      { total: 0, contacted: 0, creditPull: 0, qualified: 0, converted: 0 }
    );

    const stages = [
      { name: 'Total Leads', value: totals.total, color: 'hsl(var(--primary))' },
      { name: 'Contacted', value: totals.contacted, color: 'hsl(var(--chart-1))' },
      { name: 'Credit Auth', value: totals.creditPull, color: 'hsl(var(--chart-2))' },
      { name: 'Qualified', value: totals.qualified, color: 'hsl(var(--chart-3))' },
      { name: 'Converted', value: totals.converted, color: 'hsl(var(--chart-4))' },
    ];

    return stages.map((stage, index) => ({
      ...stage,
      dropOff: index > 0 
        ? Math.round((1 - stage.value / stages[index - 1].value) * 100) || 0
        : 0,
      percentage: totals.total > 0 
        ? Math.round((stage.value / totals.total) * 100) 
        : 0,
    }));
  }, [metrics]);

  if (metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Lead progression through stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <CardDescription>Lead progression through stages</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={funnelData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Count: <span className="font-medium text-foreground">{data.value}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          % of Total: <span className="font-medium text-foreground">{data.percentage}%</span>
                        </p>
                        {data.dropOff > 0 && (
                          <p className="text-sm text-red-600">
                            Drop-off: {data.dropOff}%
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  className="fill-foreground text-sm"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stage breakdown below chart */}
        <div className="mt-6 grid grid-cols-5 gap-2 text-center">
          {funnelData.map((stage, index) => (
            <div key={stage.name} className="space-y-1">
              <div 
                className="h-2 rounded-full" 
                style={{ backgroundColor: stage.color }}
              />
              <p className="text-xs text-muted-foreground">{stage.name}</p>
              <p className="font-semibold">{stage.percentage}%</p>
              {index > 0 && stage.dropOff > 0 && (
                <p className="text-xs text-red-500">-{stage.dropOff}%</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
