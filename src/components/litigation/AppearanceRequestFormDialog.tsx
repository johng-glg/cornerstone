import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateAppearanceRequest, useUpdateAppearanceRequest, type AppearanceRequest, type AppearanceRequestStatus } from '@/hooks/useAppearanceRequests';
import { useStaff, useCurrentStaff } from '@/hooks/useStaff';

interface AppearanceRequestFormDialogProps {
  matterId: string;
  request: AppearanceRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormValues {
  description: string;
  appearance_date: string;
  court_name: string;
  status: AppearanceRequestStatus;
  assigned_to: string;
  notes: string;
}

export function AppearanceRequestFormDialog({ matterId, request, open, onOpenChange }: AppearanceRequestFormDialogProps) {
  const createReq = useCreateAppearanceRequest();
  const updateReq = useUpdateAppearanceRequest();
  const { data: staffList } = useStaff();
  const { data: currentStaff } = useCurrentStaff();
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>();
  const status = watch('status');
  const assignedTo = watch('assigned_to');

  useEffect(() => {
    if (open) {
      if (request) {
        reset({
          description: request.description,
          appearance_date: request.appearance_date,
          court_name: request.court_name || '',
          status: request.status,
          assigned_to: request.assigned_to || '',
          notes: request.notes || '',
        });
      } else {
        reset({
          description: '',
          appearance_date: '',
          court_name: '',
          status: 'pending',
          assigned_to: '',
          notes: '',
        });
      }
    }
  }, [open, request, reset]);

  const onSubmit = (values: FormValues) => {
    const payload = {
      matter_id: matterId,
      hearing_id: null,
      requested_date: new Date().toISOString().split('T')[0],
      description: values.description,
      appearance_date: values.appearance_date,
      court_name: values.court_name || null,
      status: values.status,
      assigned_to: values.assigned_to || null,
      requested_by: currentStaff?.id || null,
      notes: values.notes || null,
    };

    if (request) {
      updateReq.mutate({ id: request.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createReq.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{request ? 'Edit Appearance Request' : 'New Appearance Request'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Description *</Label>
            <Input {...register('description', { required: true })} placeholder="What is needed for this appearance?" />
          </div>
          <div>
            <Label>Appearance Date *</Label>
            <Input {...register('appearance_date', { required: true })} type="date" />
          </div>
          <div>
            <Label>Court Name</Label>
            <Input {...register('court_name')} placeholder="Court name" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setValue('status', v as AppearanceRequestStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assigned To</Label>
            <Select value={assignedTo} onValueChange={(v) => setValue('assigned_to', v)}>
              <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {staffList?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea {...register('notes')} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createReq.isPending || updateReq.isPending}>
              {request ? 'Update' : 'Create'} Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
