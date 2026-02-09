import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAssignStaffToMatter, useMatterAssignments } from '@/hooks/useMatterAssignments';
import { useStaff } from '@/hooks/useStaff';
import { Skeleton } from '@/components/ui/skeleton';
import type { Database } from '@/integrations/supabase/types';

type AssignmentType = Database['public']['Enums']['assignment_type'];

const assignmentSchema = z.object({
  staff_id: z.string().min(1, 'Staff member is required'),
  assignment_type: z.string().min(1, 'Role is required'),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface MatterAssignmentDialogProps {
  matterId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const assignmentTypes: { value: AssignmentType; label: string }[] = [
  { value: 'litigation_attorney', label: 'Lead Attorney' },
  { value: 'case_manager', label: 'Case Manager' },
  { value: 'negotiator', label: 'Negotiator' },
];

export function MatterAssignmentDialog({
  matterId,
  open,
  onOpenChange,
}: MatterAssignmentDialogProps) {
  const assignStaff = useAssignStaffToMatter();
  const { data: staffMembers, isLoading: isLoadingStaff } = useStaff();
  const { data: currentAssignments } = useMatterAssignments(matterId);
  const [confirmData, setConfirmData] = useState<{ data: AssignmentFormData; currentName: string } | null>(null);

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      staff_id: '',
      assignment_type: '',
    },
  });

  const doAssign = async (data: AssignmentFormData) => {
    await assignStaff.mutateAsync({
      matterId,
      staffId: data.staff_id,
      assignmentType: data.assignment_type as AssignmentType,
    });
    onOpenChange(false);
    form.reset();
  };

  const onSubmit = async (data: AssignmentFormData) => {
    const existing = currentAssignments?.find(
      a => a.assignment_type === data.assignment_type && a.staff_id !== data.staff_id
    );
    if (existing?.staff) {
      const name = `${existing.staff.first_name} ${existing.staff.last_name}`;
      setConfirmData({ data, currentName: name });
      return;
    }
    await doAssign(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Staff to Matter</DialogTitle>
        </DialogHeader>

        {isLoadingStaff ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="staff_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffMembers?.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.first_name} {staff.last_name}
                            {staff.job_title && ` - ${staff.job_title}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignmentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={assignStaff.isPending}>
                  Assign
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
