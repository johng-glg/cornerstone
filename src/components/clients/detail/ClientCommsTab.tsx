import { useState, useMemo } from 'react';
import { isToday, isYesterday, isWithinInterval, subDays, startOfDay } from 'date-fns';
import { Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CommunicationFormDialog } from '@/components/clients/CommunicationFormDialog';
import { CommunicationTimelineItem } from '@/components/clients/CommunicationTimelineItem';
import {
  useClientCommunications,
  useDeleteClientCommunication,
  COMMUNICATION_TYPES,
  type ClientCommunication,
  type CommunicationType,
} from '@/hooks/useClientCommunications';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ClientCommsTabProps {
  clientId: string;
}

interface GroupedCommunications {
  today: ClientCommunication[];
  yesterday: ClientCommunication[];
  last7Days: ClientCommunication[];
  older: ClientCommunication[];
}

function groupCommunicationsByDate(communications: ClientCommunication[]): GroupedCommunications {
  const now = new Date();
  const sevenDaysAgo = subDays(startOfDay(now), 7);

  return communications.reduce<GroupedCommunications>(
    (groups, comm) => {
      const date = new Date(comm.communication_date);

      if (isToday(date)) {
        groups.today.push(comm);
      } else if (isYesterday(date)) {
        groups.yesterday.push(comm);
      } else if (isWithinInterval(date, { start: sevenDaysAgo, end: now })) {
        groups.last7Days.push(comm);
      } else {
        groups.older.push(comm);
      }

      return groups;
    },
    { today: [], yesterday: [], last7Days: [], older: [] }
  );
}

export function ClientCommsTab({ clientId }: ClientCommsTabProps) {
  const { data: communications, isLoading } = useClientCommunications(clientId);
  const deleteMutation = useDeleteClientCommunication();
  
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingCommunication, setEditingCommunication] = useState<ClientCommunication | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredCommunications = useMemo(() => {
    if (!communications) return [];
    if (typeFilter === 'all') return communications;
    return communications.filter(c => c.communication_type === typeFilter);
  }, [communications, typeFilter]);

  const groupedComms = useMemo(
    () => groupCommunicationsByDate(filteredCommunications),
    [filteredCommunications]
  );

  const handleEdit = (communication: ClientCommunication) => {
    setEditingCommunication(communication);
    setShowFormDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteMutation.mutateAsync({ id: deletingId, clientId });
    setDeletingId(null);
  };

  const handleCloseForm = () => {
    setShowFormDialog(false);
    setEditingCommunication(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const hasNoResults = filteredCommunications.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold">Communications</h2>
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {COMMUNICATION_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowFormDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Log Communication
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {hasNoResults && (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/30">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No communications yet</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            {typeFilter !== 'all'
              ? `No ${typeFilter} communications found. Try changing the filter or log a new communication.`
              : 'Start logging calls, emails, and other communications with this client.'}
          </p>
          <Button onClick={() => setShowFormDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Log First Communication
          </Button>
        </div>
      )}

      {/* Timeline */}
      {!hasNoResults && (
        <div className="space-y-6">
          {groupedComms.today.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Today</h3>
              {groupedComms.today.map(comm => (
                <CommunicationTimelineItem
                  key={comm.id}
                  communication={comm}
                  onEdit={handleEdit}
                  onDelete={setDeletingId}
                />
              ))}
            </div>
          )}

          {groupedComms.yesterday.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Yesterday</h3>
              {groupedComms.yesterday.map(comm => (
                <CommunicationTimelineItem
                  key={comm.id}
                  communication={comm}
                  onEdit={handleEdit}
                  onDelete={setDeletingId}
                />
              ))}
            </div>
          )}

          {groupedComms.last7Days.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Last 7 Days</h3>
              {groupedComms.last7Days.map(comm => (
                <CommunicationTimelineItem
                  key={comm.id}
                  communication={comm}
                  onEdit={handleEdit}
                  onDelete={setDeletingId}
                />
              ))}
            </div>
          )}

          {groupedComms.older.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Older</h3>
              {groupedComms.older.map(comm => (
                <CommunicationTimelineItem
                  key={comm.id}
                  communication={comm}
                  onEdit={handleEdit}
                  onDelete={setDeletingId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <CommunicationFormDialog
        open={showFormDialog}
        onOpenChange={handleCloseForm}
        clientId={clientId}
        communication={editingCommunication}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Communication</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this communication? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
