import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateWorkflowGroup, useUpdateWorkflowGroup } from '@/hooks/useWorkflowGroups';
import { useAuth } from '@/lib/auth';
import { ConditionBuilder } from './ConditionBuilder';
import {
  WorkflowGroup,
  WorkflowEntityType,
  entityTypeLabels,
  ConditionGroup,
} from '@/types/workflow';

// Color options for visual organization
const colorOptions = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
];

interface WorkflowGroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGroup?: WorkflowGroup | null;
}

export function WorkflowGroupFormDialog({ open, onOpenChange, editingGroup }: WorkflowGroupFormDialogProps) {
  const { staff } = useAuth();
  const createGroup = useCreateWorkflowGroup();
  const updateGroup = useUpdateWorkflowGroup();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [entityType, setEntityType] = useState<WorkflowEntityType>('client_services');
  const [filterConditions, setFilterConditions] = useState<ConditionGroup[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [color, setColor] = useState<string | null>(null);
  const [priority, setPriority] = useState(0);

  // Reset form when editing group changes
  useEffect(() => {
    if (editingGroup) {
      setName(editingGroup.name);
      setDescription(editingGroup.description || '');
      setEntityType(editingGroup.entity_type);
      setFilterConditions(editingGroup.filter_conditions);
      setIsActive(editingGroup.is_active);
      setColor(editingGroup.color);
      setPriority(editingGroup.priority);
    } else {
      resetForm();
    }
  }, [editingGroup, open]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setEntityType('client_services');
    setFilterConditions([]);
    setIsActive(true);
    setColor(null);
    setPriority(0);
  };

  const handleSubmit = () => {
    if (!name.trim() || !staff?.company_id) return;

    const groupData = {
      company_id: staff.company_id,
      name: name.trim(),
      description: description.trim() || null,
      entity_type: entityType,
      filter_conditions: filterConditions,
      is_active: isActive,
      color,
      priority,
      created_by: staff.id,
    };

    if (editingGroup) {
      updateGroup.mutate({ id: editingGroup.id, ...groupData }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createGroup.mutate(groupData, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isPending = createGroup.isPending || updateGroup.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingGroup ? 'Edit Workflow Group' : 'Create Workflow Group'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="filters">Filters</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="details" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Group Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., California Matters"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this group for?"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Select 
                    value={entityType} 
                    onValueChange={(v) => setEntityType(v as WorkflowEntityType)}
                    disabled={!!editingGroup}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(entityTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editingGroup && (
                    <p className="text-xs text-muted-foreground">
                      Entity type cannot be changed after creation
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select value={color || ''} onValueChange={(v) => setColor(v || null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="No color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No color</SelectItem>
                      {colorOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${c.class}`} />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">
                    When disabled, all rules in this group will be skipped
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
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
                  Higher priority groups are evaluated first
                </p>
              </div>
            </TabsContent>

            <TabsContent value="filters" className="mt-0 space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Define filter conditions that apply to all rules in this group. 
                Rules will only be evaluated if the entity matches these conditions.
              </div>
              <ConditionBuilder
                entityType={entityType}
                conditions={filterConditions}
                onChange={setFilterConditions}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
            {isPending ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
