import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const DETECTOR_LABEL: Record<string, string> = {
  stale_pending_tx: 'Stale Pending Transaction',
  escrow_drift: 'Escrow Balance Drift',
  escrow_balance_stale: 'Escrow Balance Stale',
  service_field_drift: 'Service Field Drift',
};

function severityIcon(sev: string) {
  if (sev === 'critical') return <AlertTriangle className="h-4 w-4 text-destructive" />;
  if (sev === 'warning') return <AlertTriangle className="h-4 w-4 text-warning" />;
  return <Info className="h-4 w-4 text-muted-foreground" />;
}

export default function ReconciliationDashboard() {
  const qc = useQueryClient();

  const { data: findings, isLoading } = useQuery({
    queryKey: ['reconciliation-findings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliation_findings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const runScan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('plsa-reconciliation', { body: {} });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reconciliation scan complete');
      qc.invalidateQueries({ queryKey: ['reconciliation-findings'] });
    },
    onError: (e) => toast.error('Scan failed', { description: (e as Error).message }),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reconciliation_findings')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reconciliation-findings'] }),
  });

  const open = findings?.filter(f => f.status === 'open') ?? [];
  const byDetector: Record<string, number> = {};
  for (const f of open) byDetector[f.detector] = (byDetector[f.detector] ?? 0) + 1;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reconciliation Dashboard</h1>
          <p className="text-muted-foreground">Detects drift between local data and Forth Pay.</p>
        </div>
        <Button onClick={() => runScan.mutate()} disabled={runScan.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${runScan.isPending ? 'animate-spin' : ''}`} />
          Run Scan Now
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.keys(DETECTOR_LABEL).map((d) => (
          <Card key={d}>
            <CardHeader className="pb-2">
              <CardDescription>{DETECTOR_LABEL[d]}</CardDescription>
              <CardTitle className="text-3xl">{byDetector[d] ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">open findings</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open Findings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : open.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
              No open findings.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Detector</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {open.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{severityIcon(f.severity)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{DETECTOR_LABEL[f.detector] ?? f.detector}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {f.entity_type}/{f.entity_id?.slice(0, 8)}
                    </TableCell>
                    <TableCell>{f.summary}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => resolve.mutate(f.id)}
                        disabled={resolve.isPending}
                      >
                        Resolve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
