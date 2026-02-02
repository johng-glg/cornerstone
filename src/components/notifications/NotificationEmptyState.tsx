import { Bell } from 'lucide-react';

export function NotificationEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>
      <h4 className="font-medium text-sm mb-1">No notifications</h4>
      <p className="text-xs text-muted-foreground">
        You're all caught up! New notifications will appear here.
      </p>
    </div>
  );
}
