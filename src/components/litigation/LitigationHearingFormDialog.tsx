import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addMinutes, differenceInMinutes, format } from 'date-fns';
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

// Duration options in 15-minute increments (15 min to 8 hours)
const durationOptions = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '75', label: '1 hour 15 min' },
  { value: '90', label: '1 hour 30 min' },
  { value: '105', label: '1 hour 45 min' },
  { value: '120', label: '2 hours' },
  { value: '150', label: '2 hours 30 min' },
  { value: '180', label: '3 hours' },
  { value: '210', label: '3 hours 30 min' },
  { value: '240', label: '4 hours' },
  { value: '300', label: '5 hours' },
  { value: '360', label: '6 hours' },
  { value: '420', label: '7 hours' },
  { value: '480', label: '8 hours' },
];

const hearingSchema = z.object({
  hearing_type: z.string().min(1, 'Hearing type is required'),
  scheduled_date: z.string().min(1, 'Start date/time is required'),
  duration: z.string().optional(),
  location: z.string().max(200).optional(),
  judge_name: z.string().max(100).optional(),
  outcome: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
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

// Calculate duration in minutes from start and end dates
function calculateDurationFromDates(startDate: string, endDate: string | null): string {
  if (!endDate) return '60'; // default 1 hour
  const start = new Date(startDate);
  const end = new Date(endDate);
  const minutes = differenceInMinutes(end, start);
  
  // Round to nearest 15-minute increment
  const rounded = Math.round(minutes / 15) * 15;
  
  // Clamp to valid range
  if (rounded < 15) return '15';
  if (rounded > 480) return '480';
  
  // Check if it's a valid option
  const validOption = durationOptions.find(opt => opt.value === String(rounded));
  return validOption ? String(rounded) : '60';
}

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
        ? format(new Date(hearing.scheduled_date), "yyyy-MM-dd'T'HH:mm")
        : '',
      duration: hearing?.scheduled_date 
        ? calculateDurationFromDates(hearing.scheduled_date, hearing.end_date)
        : '60',
      location: hearing?.location || '',
      judge_name: hearing?.judge_name || '',
      outcome: hearing?.outcome || '',
      notes: hearing?.notes || '',
    },
  });

  const onSubmit = async (data: HearingFormData) => {
    const startDate = new Date(data.scheduled_date);
    const durationMinutes = parseInt(data.duration || '60', 10);
    const endDate = addMinutes(startDate, durationMinutes);

    const hearingData = {
      matter_id: matterId,
      hearing_type: data.hearing_type,
      scheduled_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || '60'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {durationOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
