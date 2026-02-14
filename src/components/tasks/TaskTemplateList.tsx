import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAllTaskTemplates, useDeleteTaskTemplate, type TaskTemplate } from '@/hooks/useTaskTemplates';
import { TaskTemplateFormDialog } from './TaskTemplateFormDialog';

const DEPT_LABELS: Record<string, string> = {
  administration: 'Administration',
  legal: 'Legal',
  negotiations: 'Negotiations',
  sales: 'Sales',
  client_services: 'Client Services',
  operations: 'Operations',
  eligibility: 'Eligibility',
};

export function TaskTemplateList() {
  const { data: templates, isLoading } = useAllTaskTemplates();
  const deleteTemplate = useDeleteTaskTemplate();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

  const handleEdit = (t: TaskTemplate) => {
    setEditingTemplate(t);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormOpen(true);
  };

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  // Group by department
  const grouped = (templates || []).reduce<Record<string, TaskTemplate[]>>((acc, t) => {
    const key = t.department || 'uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === 'uncategorized') return 1;
    if (b === 'uncategorized') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Task Templates</h3>
          <p className="text-sm text-muted-foreground">Create reusable templates to speed up task creation</p>
        </div>
        <Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" />New Template</Button>
      </div>

      {sortedKeys.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No templates yet. Create one to get started.
        </div>
      ) : (
        sortedKeys.map((dept) => (
          <div key={dept} className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {DEPT_LABELS[dept] || 'General'}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {grouped[dept].map((t) => (
                <Card key={t.id} className={!t.is_active ? 'opacity-50' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium">{t.name}</CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteTemplate.mutate(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {t.description && <p className="text-xs text-muted-foreground mb-2">{t.description}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{t.task_type.replace('_', ' ')}</Badge>
                      <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                      {t.default_due_days != null && (
                        <Badge variant="outline" className="text-[10px]">{t.default_due_days}d due</Badge>
                      )}
                    </div>
                    <p className="text-xs mt-2 text-muted-foreground truncate">Title: {t.default_title}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      <TaskTemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editingTemplate}
      />
    </div>
  );
}
