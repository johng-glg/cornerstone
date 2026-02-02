import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, Users, Trophy, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeadMetricsSummary } from '@/hooks/useLeadMetrics';
import { LeadSourceMetricsCard } from '@/components/leads/LeadSourceMetricsCard';
import { LeadRepMetricsTable } from '@/components/leads/LeadRepMetricsTable';
import { LeadFunnelChart } from '@/components/leads/LeadFunnelChart';

export default function LeadMetrics() {
  const {
    totalLeads,
    avgConversionRate,
    bestSource,
    bestRep,
    sourceMetrics,
    repMetrics,
    isLoading,
  } = useLeadMetricsSummary();

  const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/leads">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Lead Metrics</h1>
              <p className="text-sm text-muted-foreground">
                Conversion analytics by source and rep
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Leads</CardDescription>
            <CardTitle className="text-3xl">{totalLeads}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across all sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Conversion Rate</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              {formatPercent(avgConversionRate)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Overall lead-to-client
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Best Source</CardDescription>
            <CardTitle className="text-xl flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              {bestSource?.source.replace('_', ' ') || '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {bestSource ? `${formatPercent(bestSource.conversion_ratio)} conversion` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Rep</CardDescription>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              {bestRep ? `${bestRep.first_name} ${bestRep.last_name}` : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {bestRep ? `${formatPercent(bestRep.conversion_ratio)} conversion` : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="source" className="space-y-4">
        <TabsList>
          <TabsTrigger value="source">By Source</TabsTrigger>
          <TabsTrigger value="rep">By Rep</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
        </TabsList>

        <TabsContent value="source" className="space-y-4">
          {sourceMetrics.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No source metrics available. Start tracking leads to see data here.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sourceMetrics.map((metric) => (
                <LeadSourceMetricsCard key={metric.source} metric={metric} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rep">
          <Card>
            <CardHeader>
              <CardTitle>Rep Performance</CardTitle>
              <CardDescription>
                Lead conversion metrics by sales representative
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadRepMetricsTable metrics={repMetrics} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel">
          <LeadFunnelChart metrics={sourceMetrics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
