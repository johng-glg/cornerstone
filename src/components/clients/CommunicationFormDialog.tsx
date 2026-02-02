import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCurrentStaff } from '@/hooks/useStaff';
import {
  useCreateClientCommunication,
  useUpdateClientCommunication,
  COMMUNICATION_TYPES,
  COMMUNICATION_OUTCOMES,
  type ClientCommunication,
  type CommunicationType,
  type CommunicationDirection,
} from '@/hooks/useClientCommunications';

interface CommunicationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  communication?: ClientCommunication | null;
}

export function CommunicationFormDialog({
  open,
  onOpenChange,
  clientId,
  communication,
}: CommunicationFormDialogProps) {
  const { data: currentStaff } = useCurrentStaff();
  const createMutation = useCreateClientCommunication();
  const updateMutation = useUpdateClientCommunication();

  const [formData, setFormData] = useState({
    communication_type: 'call' as CommunicationType,
    direction: 'outbound' as CommunicationDirection,
    communication_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    subject: '',
    notes: '',
    outcome: '',
    duration_minutes: '',
    contact_phone: '',
    contact_email: '',
  });

  useEffect(() => {
    if (communication) {
      setFormData({
        communication_type: communication.communication_type,
        direction: communication.direction,
        communication_date: format(new Date(communication.communication_date), "yyyy-MM-dd'T'HH:mm"),
        subject: communication.subject || '',
        notes: communication.notes || '',
        outcome: communication.outcome || '',
        duration_minutes: communication.duration_minutes?.toString() || '',
        contact_phone: communication.contact_phone || '',
        contact_email: communication.contact_email || '',
      });
    } else {
      setFormData({
        communication_type: 'call',
        direction: 'outbound',
        communication_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        subject: '',
        notes: '',
        outcome: '',
        duration_minutes: '',
        contact_phone: '',
        contact_email: '',
      });
    }
  }, [communication, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      client_id: clientId,
      communication_type: formData.communication_type,
      direction: formData.direction,
      communication_date: new Date(formData.communication_date).toISOString(),
      subject: formData.subject || null,
      notes: formData.notes || null,
      outcome: formData.outcome || null,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
      contact_phone: formData.contact_phone || null,
      contact_email: formData.contact_email || null,
      staff_id: currentStaff?.id,
    };

    if (communication) {
      await updateMutation.mutateAsync({
        id: communication.id,
        client_id: clientId,
        ...payload,
      });
    } else {
      await createMutation.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const outcomes = COMMUNICATION_OUTCOMES[formData.communication_type] || [];
  const showDuration = formData.communication_type === 'call' || formData.communication_type === 'meeting';
  const showDirection = formData.communication_type !== 'note';
  const showContactPhone = formData.communication_type === 'call' || formData.communication_type === 'sms';
  const showContactEmail = formData.communication_type === 'email';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {communication ? 'Edit Communication' : 'Log Communication'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={formData.communication_type}
              onValueChange={(value: CommunicationType) => 
                setFormData(prev => ({ ...prev, communication_type: value, outcome: '' }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMUNICATION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showDirection && (
            <div className="space-y-2">
              <Label>Direction</Label>
              <RadioGroup
                value={formData.direction}
                onValueChange={(value: CommunicationDirection) => 
                  setFormData(prev => ({ ...prev, direction: value }))
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="outbound" id="outbound" />
                  <Label htmlFor="outbound" className="font-normal cursor-pointer">
                    Outbound
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inbound" id="inbound" />
                  <Label htmlFor="inbound" className="font-normal cursor-pointer">
                    Inbound
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="communication_date">Date & Time</Label>
            <Input
              id="communication_date"
              type="datetime-local"
              value={formData.communication_date}
              onChange={e => setFormData(prev => ({ ...prev, communication_date: e.target.value }))}
              required
            />
          </div>

          {showDuration && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="0"
                placeholder="15"
                value={formData.duration_minutes}
                onChange={e => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
              />
            </div>
          )}

          {showContactPhone && (
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone Number</Label>
              <Input
                id="contact_phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.contact_phone}
                onChange={e => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
              />
            </div>
          )}

          {showContactEmail && (
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email Address</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="client@example.com"
                value={formData.contact_email}
                onChange={e => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
              />
            </div>
          )}

          {outcomes.length > 0 && (
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select
                value={formData.outcome}
                onValueChange={value => setFormData(prev => ({ ...prev, outcome: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome..." />
                </SelectTrigger>
                <SelectContent>
                  {outcomes.map(outcome => (
                    <SelectItem key={outcome.value} value={outcome.value}>
                      {outcome.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Brief description..."
              value={formData.subject}
              onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Detailed notes about the communication..."
              rows={4}
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : communication ? 'Save Changes' : 'Log Communication'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
