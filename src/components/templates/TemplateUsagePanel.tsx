import { format } from 'date-fns';
import { Activity, Mail, MessageSquare, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTemplateUsage, useTemplateUsageStats } from '@/hooks/useTemplateUsage';

interface Props {
  templateId: string;
}

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-3 w-3" />,
  sms: <MessageSquare className="h-3 w-3" />,
  document: <FileText className="h-3 w-3" />,
};

export function TemplateUsagePanel({ templateId }: Props) {
  const { data: usage, isLoading } = useTemplateUsage(templateId);
  const { data: stats } = useTemplateUsageStats(templateId);

  if (isLoading) {
    return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total uses</p>
            <p className="text-2xl font-semibold">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Last 30 days</p>
            <p className="text-2xl font-semibold">{stats?.last30 ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Last used</p>
            <p className="text-sm font-medium pt-1">
              {stats?.lastUsed ? format(new Date(stats.lastUsed), 'MMM d, yyyy') : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {stats && Object.keys(stats.byChannel).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byChannel).map(([ch, n]) => (
            <Badge key={ch} variant="secondary" className="gap-1">
              {channelIcons[ch] || <Activity className="h-3 w-3" />}
              {ch}: {n}
            </Badge>
          ))}
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium mb-2">Recent activity</h4>
        {!usage || usage.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            This template hasn't been used yet
          </div>
        ) : (
          <div className="space-y-1 max-h-80 overflow-auto">
            {usage.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded hover:bg-muted/50">
                <div className="flex items-center gap-2 min-w-0">
                  {channelIcons[u.channel || ''] || <Activity className="h-3 w-3 text-muted-foreground" />}
                  <span className="truncate">
                    {u.entity_type}{u.user && ` • ${u.user.first_name} ${u.user.last_name}`}
                  </span>
                  {!u.success && <Badge variant="destructive" className="text-xs">failed</Badge>}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(u.used_at), 'MMM d, h:mm a')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
