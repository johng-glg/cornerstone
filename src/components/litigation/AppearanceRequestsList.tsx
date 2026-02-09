import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, UserCheck, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppearanceRequests, useDeleteAppearanceRequest, type AppearanceRequest } from '@/hooks/useAppearanceRequests';
import { AppearanceRequestFormDialog } from './AppearanceRequestFormDialog';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  assigned: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  assigned: 'Assigned',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

interface AppearanceRequestsListProps {
  matterId: string;
}

export function AppearanceRequestsList({ matterId }: AppearanceRequestsListProps) {
  const { data: requests, isLoading } = useAppearanceRequests(matterId);
  const deleteRequest = useDeleteAppearanceRequest();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<AppearanceRequest | null>(null);

  const handleEdit = (req: AppearanceRequest) => {
    setEditingRequest(req);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingRequest(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          Appearance Requests
        </h3>
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" />
          New Request
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>
      ) : requests && requests.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{req.description}</p>
                    {req.court_name && <p className="text-xs text-muted-foreground">{req.court_name}</p>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(req.appearance_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {req.assigned_staff
                      ? `${req.assigned_staff.first_name} ${req.assigned_staff.last_name}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[req.status]}>{statusLabels[req.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(req)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteRequest.mutate({ id: req.id, matterId })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
          <UserCheck className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No appearance requests</p>
        </div>
      )}

      <AppearanceRequestFormDialog
        matterId={matterId}
        request={editingRequest}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingRequest(null);
        }}
      />
    </div>
  );
}
