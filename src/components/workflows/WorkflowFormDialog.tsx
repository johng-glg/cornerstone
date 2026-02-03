import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreateWorkflowRule, useUpdateWorkflowRule } from '@/hooks/useWorkflowRules';
import { useWorkflowGroups } from '@/hooks/useWorkflowGroups';
import { useAuth } from '@/lib/auth';
import { ConditionBuilder } from './ConditionBuilder';
import { ActionConfig } from './ActionConfig';
import {
  WorkflowRule,
  WorkflowEntityType,
  WorkflowTriggerType,
  entityTypeLabels,
  triggerTypeLabels,
  entityStatusOptions,
  ConditionGroup,
  WorkflowAction,
  StatusChangedTriggerConfig,
} from '@/types/workflow';

interface WorkflowFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule?: WorkflowRule | null;
  defaultGroupId?: string | null;
  defaultEntityType?: WorkflowEntityType | null;
}

const defaultConditionGroup: ConditionGroup = {
  group_id: 'g1',
  operator: 'AND',
  rules: [],
};

export function WorkflowFormDialog({ 
  open, 
  onOpenChange, 
  editingRule, 
  defaultGroupId,
  defaultEntityType,
}: WorkflowFormDialogProps) {
  const { staff } = useAuth();
  const createRule = useCreateWorkflowRule();
  const updateRule = useUpdateWorkflowRule();
  const { data: allGroups } = useWorkflowGroups();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [entityType, setEntityType] = useState<WorkflowEntityType>('client_services');
  const [triggerType, setTriggerType] = useState<WorkflowTriggerType>('status_changed');
  const [triggerFromStatuses, setTriggerFromStatuses] = useState<string[]>([]);
  const [triggerToStatuses, setTriggerToStatuses] = useState<string[]>([]);
  const [conditions, setConditions] = useState<ConditionGroup[]>([]);
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [isBlocking, setIsBlocking] = useState(false);
  const [priority, setPriority] = useState(0);
  const [groupId, setGroupId] = useState<string | null>(null);

  // Filter groups by entity type
  const availableGroups = allGroups?.filter(g => g.entity_type === entityType) || [];

  // Reset form when editing rule changes
  useEffect(() => {
    if (editingRule) {
      setName(editingRule.name);
      setDescription(editingRule.description || '');
      setEntityType(editingRule.entity_type);
      setTriggerType(editingRule.trigger_type);
      const triggerConfig = editingRule.trigger_config as StatusChangedTriggerConfig;
      setTriggerFromStatuses(triggerConfig.from || []);
      setTriggerToStatuses(triggerConfig.to || []);
      setConditions(editingRule.conditions.length > 0 ? editingRule.conditions : []);
      setActions(editingRule.actions);
      setIsBlocking(editingRule.is_blocking);
      setPriority(editingRule.priority);
      setGroupId(editingRule.group_id);
    } else {
      resetForm();
      // Apply defaults for new rules
      if (defaultEntityType) {
        setEntityType(defaultEntityType);
      }
      if (defaultGroupId) {
        setGroupId(defaultGroupId);
      }
    }
  }, [editingRule, open, defaultGroupId, defaultEntityType]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setEntityType(defaultEntityType || 'client_services');
    setTriggerType('status_changed');
    setTriggerFromStatuses([]);
    setTriggerToStatuses([]);
    setConditions([]);
    setActions([]);
    setIsBlocking(false);
    setPriority(0);
    setGroupId(defaultGroupId || null);
  };

  const handleSubmit = () => {
    if (!name.trim() || !staff?.company_id) return;

    const triggerConfig: StatusChangedTriggerConfig = {};
    if (triggerFromStatuses.length > 0) triggerConfig.from = triggerFromStatuses;
    if (triggerToStatuses.length > 0) triggerConfig.to = triggerToStatuses;

    const ruleData = {
      company_id: staff.company_id,
      group_id: groupId,
      name: name.trim(),
      description: description.trim() || null,
      entity_type: entityType,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      conditions,
      actions,
      is_blocking: isBlocking,
      is_active: true,
      priority,
      created_by: staff.id,
    };

    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, ...ruleData }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createRule.mutate(ruleData, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isPending = createRule.isPending || updateRule.isPending;
  const statusOptions = entityStatusOptions[entityType] || [];

  const toggleStatus = (status: string, type: 'from' | 'to') => {
    if (type === 'from') {
      setTriggerFromStatuses(prev => 
        prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
      );
    } else {
      setTriggerToStatuses(prev => 
        prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingRule ? 'Edit Workflow Rule' : 'Create Workflow Rule'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="trigger" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trigger">When</TabsTrigger>
            <TabsTrigger value="conditions">If</TabsTrigger>
            <TabsTrigger value="actions">Then</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="trigger" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Workflow Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Service Graduation Gate"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this workflow do?"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Select value={entityType} onValueChange={(v) => setEntityType(v as WorkflowEntityType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(entityTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <Select value={triggerType} onValueChange={(v) => setTriggerType(v as WorkflowTriggerType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(triggerTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {triggerType === 'status_changed' && (
                <>
                  <div className="space-y-2">
                    <Label>From Status (leave empty for any)</Label>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          variant={triggerFromStatuses.includes(status) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleStatus(status, 'from')}
                        >
                          {status.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>To Status (leave empty for any)</Label>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          variant={triggerToStatuses.includes(status) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleStatus(status, 'to')}
                        >
                          {status.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="conditions" className="mt-0">
              <ConditionBuilder
                entityType={entityType}
                conditions={conditions}
                onChange={setConditions}
              />
            </TabsContent>

            <TabsContent value="actions" className="mt-0">
              <ActionConfig
                actions={actions}
                onChange={setActions}
                isBlocking={isBlocking}
                entityType={entityType}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Workflow Group</Label>
                <Select 
                  value={groupId || '__none__'} 
                  onValueChange={(v) => setGroupId(v === '__none__' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No group (ungrouped)</SelectItem>
                    {availableGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Assign this rule to a group to apply group-level filters
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Blocking Rule</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, this rule can prevent status transitions
                  </p>
                </div>
                <Switch
                  checked={isBlocking}
                  onCheckedChange={setIsBlocking}
                />
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  Higher priority rules are evaluated first
                </p>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
            {isPending ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
