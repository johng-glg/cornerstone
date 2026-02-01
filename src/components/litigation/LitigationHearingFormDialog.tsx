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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateLitigationHearing, useUpdateLitigationHearing, type LitigationHearing } from '@/hooks/useLitigationHearings';

const hearingSchema = z.object({
  hearing_type: z.string().min(1, 'Hearing type is required'),
  scheduled_date: z.string().min(1, 'Scheduled date is required'),
  location: z.string().optional(),
  judge_name: z.string().optional(),
  outcome: z.string().optional(),
  notes: z.string().optional(),
});

type HearingFormData = z.infer<typeof hearingSchema>;

interface LitigationHearingFormDialogProps {
  matterId: string;
  hearing?: LitigationHearing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const hearingTypes = [
  { value: 'status_conference', label: 'Status Conference' },
  { value: 'motion_hearing', label: 'Motion Hearing' },
  { value: 'trial', label: 'Trial' },
  { value: 'deposition', label: 'Deposition' },
  { value: 'mediation', label: 'Mediation' },
];

export function LitigationHearingFormDialog({
  matterId,
  hearing,
  open,
  onOpenChange,
}: LitigationHearingFormDialogProps) {
  const createHearing = useCreateLitigationHearing();
  const updateHearing = useUpdateLitigationHearing();
  const isEditing = !!hearing;

  const form = useForm<HearingFormData>({
    resolver: zodResolver(hearingSchema),
    defaultValues: {
      hearing_type: hearing?.hearing_type || '',
      scheduled_date: hearing?.scheduled_date 
        ? new Date(hearing.scheduled_date).toISOString().slice(0, 16) 
        : '',
      location: hearing?.location || '',
      judge_name: hearing?.judge_name || '',
      outcome: hearing?.outcome || '',
      notes: hearing?.notes || '',
    },
  });

  const onSubmit = async (data: HearingFormData) => {
    const hearingData = {
      matter_id: matterId,
      hearing_type: data.hearing_type,
      scheduled_date: new Date(data.scheduled_date).toISOString(),
      location: data.location || null,
      judge_name: data.judge_name || null,
      outcome: data.outcome || null,
      notes: data.notes || null,
    };

    if (isEditing && hearing) {
      await updateHearing.mutateAsync({ id: hearing.id, ...hearingData });
    } else {
      await createHearing.mutateAsync(hearingData);
    }
    
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Hearing' : 'Schedule Hearing'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="hearing_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hearing Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hearingTypes.map((type) => (
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

            <FormField
              control={form.control}
              name="scheduled_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Courtroom or address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="judge_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judge Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Judge's name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outcome</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Hearing outcome (after it occurs)" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createHearing.isPending || updateHearing.isPending}>
                {isEditing ? 'Update' : 'Schedule'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
