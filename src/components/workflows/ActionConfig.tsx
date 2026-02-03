import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, Bell, CheckSquare, Edit3, Shield, Webhook, Mail, MessageSquare } from 'lucide-react';
import {
  WorkflowAction,
  WorkflowActionType,
  WorkflowEntityType,
  actionTypeLabels,
  CreateTaskActionConfig,
  SendNotificationActionConfig,
  SendEmailActionConfig,
  SendSmsActionConfig,
  UpdateFieldActionConfig,
  BlockTransitionActionConfig,
  entityDateFields,
  ROLE_ASSIGNMENT_OPTIONS,
} from '@/types/workflow';

interface ActionConfigProps {
  actions: WorkflowAction[];
  onChange: (actions: WorkflowAction[]) => void;
  isBlocking?: boolean;
  entityType?: WorkflowEntityType;
}

const actionIcons: Record<WorkflowActionType, React.ReactNode> = {
  create_task: <CheckSquare className="h-4 w-4" />,
  send_notification: <Bell className="h-4 w-4" />,
  send_email: <Mail className="h-4 w-4" />,
  send_sms: <MessageSquare className="h-4 w-4" />,
  update_field: <Edit3 className="h-4 w-4" />,
  block_transition: <Shield className="h-4 w-4" />,
  trigger_webhook: <Webhook className="h-4 w-4" />,
};

export function ActionConfig({ actions, onChange, isBlocking, entityType }: ActionConfigProps) {
  const dateFields = entityType ? entityDateFields[entityType] : [];

  const addAction = (type: WorkflowActionType) => {
    let config: any;
    switch (type) {
      case 'create_task':
        config = { title: '', description: '', priority: 'medium', due_mode: 'days', due_days: 3, assign_to: 'entity_owner' };
        break;
      case 'send_notification':
        config = { to: 'entity_owner', title: '', message: '' };
        break;
      case 'send_email':
        config = { to: 'client', template_id: '', subject: '', body: '' };
        break;
      case 'send_sms':
        config = { to: 'client', template_id: '', message: '' };
        break;
      case 'update_field':
        config = { field: '', value: '' };
        break;
      case 'block_transition':
        config = { message: 'This transition is blocked because conditions are not met.' };
        break;
      case 'trigger_webhook':
        config = { url: '', method: 'POST' };
        break;
    }
    onChange([...actions, { type, config }]);
  };

  const updateAction = (index: number, config: any) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], config };
    onChange(newActions);
  };

  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  const renderActionConfig = (action: WorkflowAction, index: number) => {
    switch (action.type) {
      case 'create_task': {
        const config = action.config as CreateTaskActionConfig;
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input
                value={config.title}
                onChange={(e) => updateAction(index, { ...config, title: e.target.value })}
                placeholder="e.g., Follow up with {client_name}"
              />
              <p className="text-xs text-muted-foreground">
                Use {'{'}client_name{'}'}, {'{'}service_number{'}'} for dynamic values
              </p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={config.description || ''}
                onChange={(e) => updateAction(index, { ...config, description: e.target.value })}
                placeholder="Task description..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={config.priority || 'medium'}
                  onValueChange={(v) => updateAction(index, { ...config, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date Based On</Label>
                <Select
                  value={config.due_mode || 'days'}
                  onValueChange={(v) => updateAction(index, { 
                    ...config, 
                    due_mode: v,
                    // Reset relevant fields when mode changes
                    ...(v === 'days' ? { due_field: undefined, due_field_offset: undefined } : { due_days: undefined })
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days from trigger</SelectItem>
                    <SelectItem value="field">Date field on record</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {config.due_mode === 'field' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Field</Label>
                  <Select
                    value={config.due_field || '__none__'}
                    onValueChange={(v) => updateAction(index, { ...config, due_field: v === '__none__' ? undefined : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select field...</SelectItem>
                      {dateFields.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Offset (Days)</Label>
                  <Input
                    type="number"
                    value={config.due_field_offset ?? 0}
                    onChange={(e) => updateAction(index, { ...config, due_field_offset: parseInt(e.target.value) || 0 })}
                    placeholder="e.g., -3 for 3 days before"
                  />
                  <p className="text-xs text-muted-foreground">
                    Negative = before, Positive = after
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Due In (Days)</Label>
                <Input
                  type="number"
                  value={config.due_days || 3}
                  onChange={(e) => updateAction(index, { ...config, due_days: parseInt(e.target.value) || 3 })}
                  min={1}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={config.assign_to || 'entity_owner'}
                onValueChange={(v) => updateAction(index, { ...config, assign_to: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entity_owner">Entity Owner (first assignee)</SelectItem>
                  <SelectItem value="creator">Workflow Creator</SelectItem>
                  {entityType && ROLE_ASSIGNMENT_OPTIONS[entityType]?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      }

      case 'send_notification': {
        const config = action.config as SendNotificationActionConfig;
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Send To</Label>
              <Select
                value={config.to || 'entity_owner'}
                onValueChange={(v) => updateAction(index, { ...config, to: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entity_owner">Entity Owner (first assignee)</SelectItem>
                  <SelectItem value="creator">Workflow Creator</SelectItem>
                  {entityType && ROLE_ASSIGNMENT_OPTIONS[entityType]?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notification Title</Label>
              <Input
                value={config.title}
                onChange={(e) => updateAction(index, { ...config, title: e.target.value })}
                placeholder="e.g., Status Changed"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={config.message}
                onChange={(e) => updateAction(index, { ...config, message: e.target.value })}
                placeholder="Notification message..."
                rows={2}
              />
            </div>
          </div>
        );
      }

      case 'send_email': {
        const config = action.config as SendEmailActionConfig;
        return (
          <div className="space-y-3">
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                ⚠️ Email sending is not yet functional. This is a placeholder for future integration.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Send To</Label>
              <Select
                value={config.to || 'client'}
                onValueChange={(v) => updateAction(index, { ...config, to: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="entity_owner">Entity Owner</SelectItem>
                  <SelectItem value="specific">Specific Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={config.subject}
                onChange={(e) => updateAction(index, { ...config, subject: e.target.value })}
                placeholder="e.g., Your case status has been updated"
              />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                value={config.body}
                onChange={(e) => updateAction(index, { ...config, body: e.target.value })}
                placeholder="Email body content..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Use {'{'}client_name{'}'}, {'{'}service_number{'}'} for dynamic values
              </p>
            </div>
          </div>
        );
      }

      case 'send_sms': {
        const config = action.config as SendSmsActionConfig;
        return (
          <div className="space-y-3">
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                ⚠️ SMS sending is not yet functional. This is a placeholder for future integration.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Send To</Label>
              <Select
                value={config.to || 'client'}
                onValueChange={(v) => updateAction(index, { ...config, to: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="entity_owner">Entity Owner</SelectItem>
                  <SelectItem value="specific">Specific Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={config.message}
                onChange={(e) => updateAction(index, { ...config, message: e.target.value })}
                placeholder="SMS message content..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Use {'{'}client_name{'}'}, {'{'}service_number{'}'} for dynamic values. Keep under 160 chars for best delivery.
              </p>
            </div>
          </div>
        );
      }

      case 'update_field': {
        const config = action.config as UpdateFieldActionConfig;
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Field Name</Label>
              <Input
                value={config.field}
                onChange={(e) => updateAction(index, { ...config, field: e.target.value })}
                placeholder="e.g., priority"
              />
            </div>
            <div className="space-y-2">
              <Label>New Value</Label>
              <Input
                value={String(config.value)}
                onChange={(e) => updateAction(index, { ...config, value: e.target.value })}
                placeholder="e.g., high"
              />
            </div>
          </div>
        );
      }

      case 'block_transition': {
        const config = action.config as BlockTransitionActionConfig;
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Block Message</Label>
              <Textarea
                value={config.message}
                onChange={(e) => updateAction(index, { ...config, message: e.target.value })}
                placeholder="Message to display when transition is blocked..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This message will be shown to users when they try to make a blocked status change.
              </p>
            </div>
          </div>
        );
      }

      case 'trigger_webhook': {
        const config = action.config as any;
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                value={config.url || ''}
                onChange={(e) => updateAction(index, { ...config, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={config.method || 'POST'}
                onValueChange={(v) => updateAction(index, { ...config, method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="space-y-4">
      {actions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              No actions defined. Add actions to execute when conditions are met.
            </p>
          </CardContent>
        </Card>
      ) : (
        actions.map((action, index) => (
          <Card key={index}>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {actionIcons[action.type]}
                  <CardTitle className="text-sm font-medium">
                    {actionTypeLabels[action.type]}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAction(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {renderActionConfig(action, index)}
            </CardContent>
          </Card>
        ))
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => addAction('create_task')}>
          <CheckSquare className="h-4 w-4 mr-2" />
          Create Task
        </Button>
        <Button variant="outline" size="sm" onClick={() => addAction('send_notification')}>
          <Bell className="h-4 w-4 mr-2" />
          In-App Notification
        </Button>
        <Button variant="outline" size="sm" onClick={() => addAction('send_email')}>
          <Mail className="h-4 w-4 mr-2" />
          Send Email
        </Button>
        <Button variant="outline" size="sm" onClick={() => addAction('send_sms')}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Send SMS
        </Button>
        <Button variant="outline" size="sm" onClick={() => addAction('update_field')}>
          <Edit3 className="h-4 w-4 mr-2" />
          Update Field
        </Button>
        {isBlocking && (
          <Button variant="outline" size="sm" onClick={() => addAction('block_transition')}>
            <Shield className="h-4 w-4 mr-2" />
            Block Transition
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => addAction('trigger_webhook')}>
          <Webhook className="h-4 w-4 mr-2" />
          Trigger Webhook
        </Button>
      </div>
    </div>
  );
}
