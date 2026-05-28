import { useState } from 'react';
import { format } from 'date-fns';
import { History, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTemplateVersions } from '@/hooks/useTemplateVersions';
import { useRestoreTemplateVersion } from '@/hooks/useRestoreTemplateVersion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  templateId: string;
  currentVersion: number;
}

export function TemplateVersionHistory({ templateId, currentVersion }: Props) {
  const { data: versions, isLoading } = useTemplateVersions(templateId);
  const restore = useRestoreTemplateVersion();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; version: number } | null>(null);

  if (isLoading) {
    return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>No version history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {versions.map((v) => {
        const isCurrent = v.version_number === currentVersion;
        const isOpen = expanded === v.id;
        return (
          <Card key={v.id} className={isCurrent ? 'border-primary' : ''}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : v.id)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Badge variant={isCurrent ? 'default' : 'outline'}>v{v.version_number}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {v.change_notes || 'No change notes'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(v.created_at), 'MMM d, yyyy h:mm a')}
                      {v.creator && ` • ${v.creator.first_name} ${v.creator.last_name}`}
                    </p>
                  </div>
                </button>
                {!isCurrent && (
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setRestoreTarget({ id: v.id, version: v.version_number })}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Restore
                  </Button>
                )}
              </div>
              {isOpen && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {v.subject && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Subject</p>
                      <p className="text-sm">{v.subject}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Content</p>
                    <pre className="text-xs bg-muted/50 p-2 rounded font-mono whitespace-pre-wrap max-h-48 overflow-auto">
                      {v.content}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore version {restoreTarget?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the current template content with version {restoreTarget?.version}
              and create a new version entry. The current content will remain in history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (restoreTarget) restore.mutate({ templateId, versionId: restoreTarget.id });
                setRestoreTarget(null);
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
