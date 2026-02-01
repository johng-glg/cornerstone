import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, X, User } from 'lucide-react';
import { format } from 'date-fns';
import { retentionTypeConfig, type RetentionType } from '@/types/serviceStatus';
import { useStaff } from '@/hooks/useStaff';

interface RetentionPanelProps {
  retentionFlag: boolean;
  retentionType: RetentionType;
  retentionDate: string | null;
  retentionReason: string | null;
  retentionAssignedTo: string | null;
  onUpdate: (data: {
    retention_flag: boolean;
    retention_type: RetentionType;
    retention_date: string | null;
    retention_reason: string | null;
    retention_assigned_to: string | null;
  }) => void;
  isPending?: boolean;
}

export function RetentionPanel({
  retentionFlag,
  retentionType,
  retentionDate,
  retentionReason,
  retentionAssignedTo,
  onUpdate,
  isPending = false,
}: RetentionPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newType, setNewType] = useState<RetentionType>(retentionType);
  const [newReason, setNewReason] = useState(retentionReason || '');
  const [newAssignedTo, setNewAssignedTo] = useState(retentionAssignedTo || '');
  const { data: staff } = useStaff();

  const handleFlag = () => {
    setIsEditing(true);
    setNewType('at_risk');
    setNewReason('');
    setNewAssignedTo('');
  };

  const handleClearFlag = () => {
    onUpdate({
      retention_flag: false,
      retention_type: null,
      retention_date: null,
      retention_reason: null,
      retention_assigned_to: null,
    });
  };

  const handleSave = () => {
    onUpdate({
      retention_flag: true,
      retention_type: newType,
      retention_date: new Date().toISOString(),
      retention_reason: newReason || null,
      retention_assigned_to: newAssignedTo || null,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewType(retentionType);
    setNewReason(retentionReason || '');
    setNewAssignedTo(retentionAssignedTo || '');
  };

  if (!retentionFlag && !isEditing) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">No retention concerns flagged</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleFlag}>
              Flag Concern
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEditing) {
    return (
      <Card className="border-yellow-500/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            Flag Retention Concern
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Concern Type *</Label>
            <Select value={newType || ''} onValueChange={(v) => setNewType(v as RetentionType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(retentionTypeConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={newAssignedTo || 'unassigned'} onValueChange={(v) => setNewAssignedTo(v === 'unassigned' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staff?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Details / Reason</Label>
            <Textarea
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Describe the concern..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!newType || isPending}>
              Save Concern
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show existing retention flag
  const assignedStaff = staff?.find(s => s.id === retentionAssignedTo);

  return (
    <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            Retention Concern
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClearFlag} disabled={isPending}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          {retentionType && (
            <Badge className={retentionTypeConfig[retentionType].className}>
              {retentionTypeConfig[retentionType].label}
            </Badge>
          )}
          {retentionDate && (
            <span className="text-xs text-muted-foreground">
              Flagged {format(new Date(retentionDate), 'MMM d, yyyy')}
            </span>
          )}
        </div>

        {assignedStaff && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3 w-3 text-muted-foreground" />
            <span>Assigned to: {assignedStaff.first_name} {assignedStaff.last_name}</span>
          </div>
        )}

        {retentionReason && (
          <p className="text-sm text-muted-foreground">{retentionReason}</p>
        )}

        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          Edit Concern
        </Button>
      </CardContent>
    </Card>
  );
}
