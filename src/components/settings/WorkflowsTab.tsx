import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Edit, Trash2, Shield, Zap, ChevronDown, FolderOpen, Layers } from 'lucide-react';
import { useWorkflowRules, useDeleteWorkflowRule, useToggleWorkflowRule } from '@/hooks/useWorkflowRules';
import { useWorkflowGroups, useDeleteWorkflowGroup, useToggleWorkflowGroup } from '@/hooks/useWorkflowGroups';
import { WorkflowFormDialog } from '@/components/workflows/WorkflowFormDialog';
import { WorkflowGroupFormDialog } from '@/components/workflows/WorkflowGroupFormDialog';
import { entityTypeLabels, triggerTypeLabels } from '@/types/workflow';
import type { WorkflowRule, WorkflowGroup } from '@/types/workflow';
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

// Color classes mapping
const colorClasses: Record<string, string> = {
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
  orange: 'border-l-orange-500',
  purple: 'border-l-purple-500',
  red: 'border-l-red-500',
  yellow: 'border-l-yellow-500',
  pink: 'border-l-pink-500',
  teal: 'border-l-teal-500',
};

// Helper to summarize filter conditions
function summarizeFilters(group: WorkflowGroup): string {
  if (group.filter_conditions.length === 0) return 'No filters';
  
  const rules = group.filter_conditions.flatMap(g => g.rules);
  if (rules.length === 0) return 'No filters';
  
  return rules.slice(0, 2).map(r => {
    const val = Array.isArray(r.value) ? r.value.join(', ') : String(r.value);
    return `${r.field} ${r.operator} ${val}`;
  }).join(', ') + (rules.length > 2 ? ` +${rules.length - 2} more` : '');
}

export function WorkflowsTab() {
  const { data: rules, isLoading: rulesLoading } = useWorkflowRules();
  const { data: groups, isLoading: groupsLoading } = useWorkflowGroups();
  const deleteRule = useDeleteWorkflowRule();
  const toggleRule = useToggleWorkflowRule();
  const deleteGroup = useDeleteWorkflowGroup();
  const toggleGroup = useToggleWorkflowGroup();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WorkflowGroup | null>(null);
  const [deleteGroupConfirmId, setDeleteGroupConfirmId] = useState<string | null>(null);
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['ungrouped']));

  // Organize rules by group
  const { groupedRules, ungroupedRules } = useMemo(() => {
    if (!rules) return { groupedRules: new Map<string, WorkflowRule[]>(), ungroupedRules: [] };
    
    const grouped = new Map<string, WorkflowRule[]>();
    const ungrouped: WorkflowRule[] = [];
    
    for (const rule of rules) {
      if (rule.group_id) {
        const existing = grouped.get(rule.group_id) || [];
        grouped.set(rule.group_id, [...existing, rule]);
      } else {
        ungrouped.push(rule);
      }
    }
    
    return { groupedRules: grouped, ungroupedRules: ungrouped };
  }, [rules]);

  const handleEditRule = (rule: WorkflowRule) => {
    setEditingRule(rule);
    setFormOpen(true);
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingRule(null);
  };

  const handleDeleteRule = (id: string) => {
    deleteRule.mutate(id, {
      onSuccess: () => setDeleteConfirmId(null),
    });
  };

  const handleToggleRule = (id: string, isActive: boolean) => {
    toggleRule.mutate({ id, isActive });
  };

  const handleEditGroup = (group: WorkflowGroup) => {
    setEditingGroup(group);
    setGroupFormOpen(true);
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setGroupFormOpen(true);
  };

  const handleGroupFormClose = () => {
    setGroupFormOpen(false);
    setEditingGroup(null);
  };

  const handleDeleteGroup = (id: string) => {
    deleteGroup.mutate(id, {
      onSuccess: () => setDeleteGroupConfirmId(null),
    });
  };

  const handleToggleGroup = (id: string, isActive: boolean) => {
    toggleGroup.mutate({ id, isActive });
  };

  const toggleExpanded = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const isLoading = rulesLoading || groupsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const hasNoContent = (!rules || rules.length === 0) && (!groups || groups.length === 0);

  const renderRuleCard = (rule: WorkflowRule) => (
    <Card key={rule.id} className={`ml-4 ${!rule.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">{rule.name}</CardTitle>
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
            <CardDescription className="mt-1 text-xs">
              {entityTypeLabels[rule.entity_type]} • {triggerTypeLabels[rule.trigger_type]}
              {rule.description && ` • ${rule.description}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={rule.is_active}
              onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleEditRule(rule)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDeleteConfirmId(rule.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {(rule.conditions.length > 0 || rule.actions.length > 0) && (
        <CardContent className="pt-0 pb-3 px-4">
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
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Workflow Rules</h3>
          <p className="text-sm text-muted-foreground">
            Automate actions and control status transitions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCreateGroup}>
            <Layers className="h-4 w-4 mr-2" />
            New Group
          </Button>
          <Button onClick={handleCreateRule}>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      {hasNoContent ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No workflow rules yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create workflow rules to automate actions and control status transitions.
              Organize them into groups for better management.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCreateGroup}>
                <Layers className="h-4 w-4 mr-2" />
                Create a Group
              </Button>
              <Button onClick={handleCreateRule}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Workflow
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Render groups */}
          {groups?.map((group) => {
            const rulesInGroup = groupedRules.get(group.id) || [];
            const isExpanded = expandedGroups.has(group.id);
            const borderColor = group.color ? colorClasses[group.color] : '';
            
            return (
              <Collapsible
                key={group.id}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(group.id)}
              >
                <Card className={`${!group.is_active ? 'opacity-60' : ''} ${borderColor ? `border-l-4 ${borderColor}` : ''}`}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{group.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {rulesInGroup.length} rule{rulesInGroup.length !== 1 ? 's' : ''}
                              </Badge>
                              {!group.is_active && (
                                <Badge variant="secondary" className="text-xs">Inactive</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {entityTypeLabels[group.entity_type]} • {summarizeFilters(group)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={group.is_active}
                            onCheckedChange={(checked) => handleToggleGroup(group.id, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditGroup(group)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDeleteGroupConfirmId(group.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                      {rulesInGroup.length === 0 ? (
                        <div className="ml-4 text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                          No rules in this group yet
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {rulesInGroup.map(renderRuleCard)}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}

          {/* Render ungrouped rules */}
          {ungroupedRules.length > 0 && (
            <Collapsible
              open={expandedGroups.has('ungrouped')}
              onOpenChange={() => toggleExpanded('ungrouped')}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedGroups.has('ungrouped') ? '' : '-rotate-90'}`} />
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground">Ungrouped</span>
                        <Badge variant="outline" className="text-xs">
                          {ungroupedRules.length} rule{ungroupedRules.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-2">
                      {ungroupedRules.map(renderRuleCard)}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </div>
      )}

      <WorkflowFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        editingRule={editingRule}
      />

      <WorkflowGroupFormDialog
        open={groupFormOpen}
        onOpenChange={handleGroupFormClose}
        editingGroup={editingGroup}
      />

      {/* Delete Rule Confirmation */}
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
              onClick={() => deleteConfirmId && handleDeleteRule(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={!!deleteGroupConfirmId} onOpenChange={() => setDeleteGroupConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow Group?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The group will be deleted, but rules inside it will be moved to ungrouped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGroupConfirmId && handleDeleteGroup(deleteGroupConfirmId)}
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
