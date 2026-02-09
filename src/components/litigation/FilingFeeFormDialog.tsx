import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateFilingFee, useUpdateFilingFee, type FilingFee, type FilingFeeStatus } from '@/hooks/useFilingFees';
import { useCurrentStaff } from '@/hooks/useStaff';

interface FilingFeeFormDialogProps {
  matterId: string;
  fee: FilingFee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormValues {
  description: string;
  amount: string;
  status: FilingFeeStatus;
  requested_date: string;
  approved_date: string;
  paid_date: string;
  notes: string;
}

export function FilingFeeFormDialog({ matterId, fee, open, onOpenChange }: FilingFeeFormDialogProps) {
  const createFee = useCreateFilingFee();
  const updateFee = useUpdateFilingFee();
  const { data: currentStaff } = useCurrentStaff();
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>();
  const status = watch('status');

  useEffect(() => {
    if (open) {
      if (fee) {
        reset({
          description: fee.description,
          amount: String(fee.amount),
          status: fee.status,
          requested_date: fee.requested_date,
          approved_date: fee.approved_date || '',
          paid_date: fee.paid_date || '',
          notes: fee.notes || '',
        });
      } else {
        reset({
          description: '',
          amount: '',
          status: 'pending',
          requested_date: new Date().toISOString().split('T')[0],
          approved_date: '',
          paid_date: '',
          notes: '',
        });
      }
    }
  }, [open, fee, reset]);

  const onSubmit = (values: FormValues) => {
    const payload = {
      matter_id: matterId,
      description: values.description,
      amount: parseFloat(values.amount),
      status: values.status,
      requested_date: values.requested_date,
      approved_date: values.approved_date || null,
      paid_date: values.paid_date || null,
      notes: values.notes || null,
      created_by: currentStaff?.id || null,
    };

    if (fee) {
      updateFee.mutate({ id: fee.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createFee.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{fee ? 'Edit Filing Fee' : 'Add Filing Fee'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Description *</Label>
            <Input {...register('description', { required: true })} placeholder="e.g. Initial filing fee" />
          </div>
          <div>
            <Label>Amount *</Label>
            <Input {...register('amount', { required: true })} type="number" step="0.01" min="0" placeholder="0.00" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setValue('status', v as FilingFeeStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="submitted_to_client">Submitted to Client</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Requested Date</Label>
            <Input {...register('requested_date')} type="date" />
          </div>
          {(status === 'approved' || status === 'paid') && (
            <div>
              <Label>Approved Date</Label>
              <Input {...register('approved_date')} type="date" />
            </div>
          )}
          {status === 'paid' && (
            <div>
              <Label>Paid Date</Label>
              <Input {...register('paid_date')} type="date" />
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea {...register('notes')} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createFee.isPending || updateFee.isPending}>
              {fee ? 'Update' : 'Add'} Fee
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
