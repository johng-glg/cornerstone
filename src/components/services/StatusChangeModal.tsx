import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useValidateTransition, TransitionBlockedError } from '@/hooks/useValidateTransition';
import { TransitionBlockedDialog } from '@/components/workflows/TransitionBlockedDialog';
import {
  primaryStatusConfig,
  paymentStatusConfig,
  contactStatusConfig,
  retentionTypeConfig,
  type PrimaryServiceStatus,
  type PaymentStatus,
  type ContactStatus,
  type RetentionType,
} from '@/types/serviceStatus';

type StatusDimension = 'primary' | 'payment' | 'contact' | 'retention';

interface StatusChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimension: StatusDimension;
  currentValue: string | null;
  onSubmit: (newValue: string, reason: string) => void;
  isPending?: boolean;
  serviceId?: string; // Required for workflow validation
}

export function StatusChangeModal({
  open,
  onOpenChange,
  dimension,
  currentValue,
  onSubmit,
  isPending = false,
  serviceId,
}: StatusChangeModalProps) {
  const [newValue, setNewValue] = useState(currentValue || '');
  const [reason, setReason] = useState('');
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; message: string; ruleName?: string | null }>({
    open: false,
    message: '',
    ruleName: null,
  });
  
  const validateTransition = useValidateTransition();
  
  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setNewValue(currentValue || '');
      setReason('');
    }
  }, [open, currentValue]);

  const handleSubmit = async () => {
    if (!newValue || !reason.trim()) return;
    
    // Only validate primary status changes (the main blocking use case)
    if (dimension === 'primary' && serviceId && currentValue !== newValue) {
      try {
        const result = await validateTransition.mutateAsync({
          entityType: 'client_services',
          entityId: serviceId,
          fromStatus: currentValue || '',
          toStatus: newValue,
        });
        
        if (!result.allowed) {
          setBlockDialog({
            open: true,
            message: result.block_message || 'This status change is blocked by a workflow rule.',
            ruleName: result.rule_name,
          });
          return;
        }
      } catch (error) {
        // If validation fails, still allow the change (fail open)
        console.error('Workflow validation error:', error);
      }
    }
    
    onSubmit(newValue, reason.trim());
    setReason('');
    onOpenChange(false);
  };

  const getOptions = () => {
    switch (dimension) {
      case 'primary':
        return Object.entries(primaryStatusConfig).map(([value, config]) => ({
          value,
          label: config.label,
          description: config.description,
        }));
      case 'payment':
        return Object.entries(paymentStatusConfig).map(([value, config]) => ({
          value,
          label: config.label,
          description: config.description,
        }));
      case 'contact':
        return Object.entries(contactStatusConfig).map(([value, config]) => ({
          value,
          label: config.label,
          description: config.description,
        }));
      case 'retention':
        return Object.entries(retentionTypeConfig).map(([value, config]) => ({
          value,
          label: config.label,
          description: config.description,
        }));
      default:
        return [];
    }
  };

  const getTitle = () => {
    switch (dimension) {
      case 'primary': return 'Change Primary Status';
      case 'payment': return 'Change Payment Status';
      case 'contact': return 'Change Contact Status';
      case 'retention': return 'Set Retention Flag';
      default: return 'Change Status';
    }
  };

  const options = getOptions();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select value={newValue} onValueChange={setNewValue}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <span>{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground ml-2">
                          - {option.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reason for Change *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this status is being changed..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This will be recorded in the status history for audit purposes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!newValue || !reason.trim() || isPending || validateTransition.isPending}
          >
            {validateTransition.isPending ? 'Validating...' : isPending ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      <TransitionBlockedDialog
        open={blockDialog.open}
        onOpenChange={(open) => setBlockDialog({ ...blockDialog, open })}
        message={blockDialog.message}
        ruleName={blockDialog.ruleName}
      />
    </Dialog>
  );
}
