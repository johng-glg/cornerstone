import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, Shield, Zap } from 'lucide-react';
import { useWorkflowRules, useDeleteWorkflowRule, useToggleWorkflowRule } from '@/hooks/useWorkflowRules';
import { WorkflowFormDialog } from '@/components/workflows/WorkflowFormDialog';
import { entityTypeLabels, triggerTypeLabels } from '@/types/workflow';
import type { WorkflowRule } from '@/types/workflow';
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

export function WorkflowsTab() {
  const { data: rules, isLoading } = useWorkflowRules();
  const deleteRule = useDeleteWorkflowRule();
  const toggleRule = useToggleWorkflowRule();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEdit = (rule: WorkflowRule) => {
    setEditingRule(rule);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingRule(null);
  };

  const handleDelete = (id: string) => {
    deleteRule.mutate(id, {
      onSuccess: () => setDeleteConfirmId(null),
    });
  };

  const handleToggle = (id: string, isActive: boolean) => {
    toggleRule.mutate({ id, isActive });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Workflow Rules</h3>
          <p className="text-sm text-muted-foreground">
            Automate actions and control status transitions
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {rules && rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No workflow rules yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create workflow rules to automate actions and control status transitions
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules?.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
              <CardHeader className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{rule.name}</CardTitle>
                      {rule.is_blocking && (
                        <Badge variant="destructive" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Blocking
                        </Badge>
                      )}
                      {!rule.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {entityTypeLabels[rule.entity_type]} • {triggerTypeLabels[rule.trigger_type]}
                      {rule.description && ` • ${rule.description}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => handleToggle(rule.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {(rule.conditions.length > 0 || rule.actions.length > 0) && (
                <CardContent className="pt-0 pb-4">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {rule.conditions.length > 0 && (
                      <span>{rule.conditions.length} condition group(s)</span>
                    )}
                    {rule.actions.length > 0 && (
                      <span>{rule.actions.length} action(s)</span>
                    )}
                    {rule.priority > 0 && (
                      <span>Priority: {rule.priority}</span>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <WorkflowFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        editingRule={editingRule}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The workflow rule will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
