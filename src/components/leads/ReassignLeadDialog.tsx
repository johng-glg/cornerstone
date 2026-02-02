import { useState } from 'react';
import { useAssignLead } from '@/hooks/useAssignLead';
import { useStaff } from '@/hooks/useStaff';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, UserPlus } from 'lucide-react';

interface ReassignLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  currentAssigneeId?: string | null;
  leadName?: string;
}

export function ReassignLeadDialog({
  open,
  onOpenChange,
  leadId,
  currentAssigneeId,
  leadName,
}: ReassignLeadDialogProps) {
  const { data: salesStaff, isLoading } = useStaff('sales_intake');
  const assignLead = useAssignLead();

  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [reason, setReason] = useState('');

  const handleAssign = async () => {
    if (!selectedStaffId) return;

    await assignLead.mutateAsync({
      leadId,
      staffId: selectedStaffId,
      reason: reason || undefined,
    });

    setSelectedStaffId('');
    setReason('');
    onOpenChange(false);
  };

  const availableStaff = salesStaff?.filter(s => s.id !== currentAssigneeId) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Reassign Lead
          </DialogTitle>
          <DialogDescription>
            {leadName ? `Assign "${leadName}" to a different sales rep.` : 'Select a new assignee for this lead.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select New Assignee</Label>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : availableStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No other sales reps available
              </p>
            ) : (
              <RadioGroup value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableStaff.map((staff) => (
                    <label
                      key={staff.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedStaffId === staff.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <RadioGroupItem value={staff.id} className="sr-only" />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={staff.avatar_url || undefined} />
                        <AvatarFallback>
                          {staff.first_name[0]}{staff.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {staff.first_name} {staff.last_name}
                        </p>
                        {staff.job_title && (
                          <p className="text-xs text-muted-foreground truncate">
                            {staff.job_title}
                          </p>
                        )}
                      </div>
                      <div className={`h-4 w-4 rounded-full border-2 ${
                        selectedStaffId === staff.id 
                          ? 'border-primary bg-primary' 
                          : 'border-muted-foreground/30'
                      }`}>
                        {selectedStaffId === staff.id && (
                          <div className="h-full w-full flex items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why is this lead being reassigned?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedStaffId || assignLead.isPending}
          >
            {assignLead.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
