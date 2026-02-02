import { useState } from 'react';
import { useAssignmentRules, useDeleteAssignmentRule } from '@/hooks/useAssignmentRules';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { AssignmentRuleFormDialog } from './AssignmentRuleFormDialog';
import { ASSIGNMENT_METHOD_LABELS } from '@/types/assignment';
import { Plus, Settings2, Trash2, Users, Zap } from 'lucide-react';

export function AssignmentRulesTab() {
  const { data: rules, isLoading } = useAssignmentRules();
  const deleteRule = useDeleteAssignmentRule();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  const editingRule = rules?.find(r => r.id === editingRuleId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Lead Assignment Rules</h3>
          <p className="text-sm text-muted-foreground">
            Configure how leads are automatically assigned to sales reps
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Rule
        </Button>
      </div>

      {rules?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No assignment rules configured yet.<br />
              Create a rule to start auto-assigning leads.
            </p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules?.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{rule.name}</CardTitle>
                      {rule.is_default && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      {!rule.is_active && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                      {rule.config?.auto_assign && (
                        <Badge variant="default" className="gap-1">
                          <Zap className="h-3 w-3" />
                          Auto
                        </Badge>
                      )}
                    </div>
                    {rule.description && (
                      <CardDescription>{rule.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingRuleId(rule.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingRuleId(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Method:</span>
                    <Badge variant="outline">
                      {ASSIGNMENT_METHOD_LABELS[rule.method]}
                    </Badge>
                  </div>
                  {rule.source && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Source:</span>
                      <span className="capitalize">{rule.source.replace('_', ' ')}</span>
                    </div>
                  )}
                  {rule.interest_type && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Interest:</span>
                      <span className="capitalize">{rule.interest_type.replace('_', ' ')}</span>
                    </div>
                  )}
                  {(rule.min_debt_amount || rule.max_debt_amount) && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Debt Range:</span>
                      <span>
                        {rule.min_debt_amount ? `$${rule.min_debt_amount.toLocaleString()}` : '$0'}
                        {' - '}
                        {rule.max_debt_amount ? `$${rule.max_debt_amount.toLocaleString()}` : '∞'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Priority:</span>
                    <span>{rule.priority}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AssignmentRuleFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <AssignmentRuleFormDialog
        open={!!editingRuleId}
        onOpenChange={(open) => !open && setEditingRuleId(null)}
        rule={editingRule}
      />

      <AlertDialog open={!!deletingRuleId} onOpenChange={(open) => !open && setDeletingRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this assignment rule. Leads will no longer be
              auto-assigned using this rule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingRuleId) {
                  deleteRule.mutate(deletingRuleId);
                  setDeletingRuleId(null);
                }
              }}
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
