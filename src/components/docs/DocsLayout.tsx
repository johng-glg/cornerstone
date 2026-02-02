import { Outlet } from 'react-router-dom';
import { DocsSidebar } from '@/components/docs/DocsSidebar';
import { ScrollArea } from '@/components/ui/scroll-area';

export function DocsLayout() {
  return (
    <div className="flex h-screen">
      <DocsSidebar />
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-8 max-w-4xl mx-auto">
            <Outlet />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
