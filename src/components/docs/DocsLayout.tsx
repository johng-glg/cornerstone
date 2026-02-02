import { Outlet, Link } from 'react-router-dom';
import { DocsSidebar } from '@/components/docs/DocsSidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function DocsLayout() {
  return (
    <div className="flex h-screen">
      <DocsSidebar />
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="border-b px-8 py-3 flex items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-8 max-w-4xl mx-auto">
            <Outlet />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
