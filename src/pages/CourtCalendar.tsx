import { Calendar as CalendarIcon } from 'lucide-react';
import { CourtCalendar } from '@/components/litigation/CourtCalendar';

export default function CourtCalendarPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <CalendarIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Court Calendar</h1>
          <p className="text-sm text-muted-foreground">
            All scheduled hearings and court dates
          </p>
        </div>
      </div>

      <CourtCalendar />
    </div>
  );
}
