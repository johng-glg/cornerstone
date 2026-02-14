import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateList } from '@/components/templates/TemplateList';
import { TaskTemplateList } from '@/components/tasks/TaskTemplateList';

export function TemplatesTab() {
  return (
    <Tabs defaultValue="communications">
      <TabsList>
        <TabsTrigger value="communications">Communications</TabsTrigger>
        <TabsTrigger value="tasks">Task Templates</TabsTrigger>
      </TabsList>
      <TabsContent value="communications">
        <TemplateList />
      </TabsContent>
      <TabsContent value="tasks">
        <TaskTemplateList />
      </TabsContent>
    </Tabs>
  );
}
