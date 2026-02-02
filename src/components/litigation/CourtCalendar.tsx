import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isPast,
  isFuture,
  differenceInDays,
  getHours,
  getMinutes
} from 'date-fns';
import { ChevronLeft, ChevronRight, Download, Filter, ExternalLink, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllHearings, useUniqueCourts, useHearingTypes, type HearingWithMatter } from '@/hooks/useAllHearings';
import { useStaff } from '@/hooks/useStaff';
import { useLitigationMatter } from '@/hooks/useLitigationMatters';
import { LitigationMatterDetailSheet } from '@/components/litigation/LitigationMatterDetailSheet';
import { LitigationHearingFormDialog } from '@/components/litigation/LitigationHearingFormDialog';
import { cn } from '@/lib/utils';
import { differenceInMinutes } from 'date-fns';

type ViewMode = 'month' | 'week';

// Working hours for the calendar (7am to 7pm)
const HOUR_START = 7;
const HOUR_END = 19;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

function getHearingUrgency(hearing: HearingWithMatter) {
  const hearingDate = new Date(hearing.scheduled_date);
  const daysUntil = differenceInDays(hearingDate, new Date());
  
  // Past hearings
  if (isPast(hearingDate)) {
    return hearing.outcome ? 'completed' : 'needs_outcome';
  }
  
  // Check response deadline on matter
  const responseDeadline = hearing.litigation_matter?.response_deadline;
  if (responseDeadline) {
    const deadlineDays = differenceInDays(new Date(responseDeadline), new Date());
    if (deadlineDays <= 7 && deadlineDays >= 0) {
      return 'urgent';
    }
  }
  
  // Future hearings
  if (daysUntil <= 7) return 'urgent';
  if (daysUntil <= 14) return 'soon';
  return 'normal';
}

const urgencyColors = {
  urgent: 'bg-destructive text-destructive-foreground',
  soon: 'bg-yellow-500 text-white',
  normal: 'bg-primary text-primary-foreground',
  completed: 'bg-muted text-muted-foreground',
  needs_outcome: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
};

function generateICalEvent(hearing: HearingWithMatter) {
  const clientName = hearing.litigation_matter?.client_service?.primary_client
    ? `${hearing.litigation_matter.client_service.primary_client.first_name} ${hearing.litigation_matter.client_service.primary_client.last_name}`
    : 'Unknown Client';
  
  const summary = `${hearing.hearing_type} - ${clientName} vs ${hearing.litigation_matter?.opposing_party || 'Unknown'}`;
  const location = hearing.location || hearing.litigation_matter?.court_name || '';
  const description = [
    `Case: ${hearing.litigation_matter?.case_number || 'N/A'}`,
    `Court: ${hearing.litigation_matter?.court_name || 'N/A'}`,
    `Judge: ${hearing.judge_name || 'TBD'}`,
    hearing.notes ? `Notes: ${hearing.notes}` : '',
  ].filter(Boolean).join('\\n');

  const startDate = new Date(hearing.scheduled_date);
  const endDate = hearing.end_date 
    ? new Date(hearing.end_date) 
    : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration
  
  const formatICalDate = (date: Date) => 
    date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return [
    'BEGIN:VEVENT',
    `DTSTART:${formatICalDate(startDate)}`,
    `DTEND:${formatICalDate(endDate)}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    `UID:${hearing.id}@guardian-crm`,
    'END:VEVENT',
  ].join('\r\n');
}

function exportToICal(hearings: HearingWithMatter[]) {
  const events = hearings.map(generateICalEvent).join('\r\n');
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Guardian CRM//Court Calendar//EN',
    'CALSCALE:GREGORIAN',
    events,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([calendar], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `court-calendar-${format(new Date(), 'yyyy-MM-dd')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Week View with hourly slots
function WeekViewGrid({ 
  days, 
  hearingsByDate, 
  currentDate,
  onOpenMatter,
  onEditHearing
}: { 
  days: Date[]; 
  hearingsByDate: Map<string, HearingWithMatter[]>;
  currentDate: Date;
  onOpenMatter: (matterId: string) => void;
  onEditHearing: (hearing: HearingWithMatter) => void;
}) {
  // Calculate hearing position and height based on time
  const getHearingPosition = (hearing: HearingWithMatter) => {
    const startDate = new Date(hearing.scheduled_date);
    const hour = getHours(startDate);
    const minutes = getMinutes(startDate);
    
    // Calculate top position as percentage
    const hourOffset = hour - HOUR_START;
    const minuteOffset = minutes / 60;
    const topPercent = ((hourOffset + minuteOffset) / (HOUR_END - HOUR_START + 1)) * 100;
    
    // Calculate height based on end_date or default to 1 hour
    let durationMinutes = 60; // default 1 hour
    if (hearing.end_date) {
      const endDate = new Date(hearing.end_date);
      durationMinutes = differenceInMinutes(endDate, startDate);
      if (durationMinutes < 30) durationMinutes = 30; // minimum 30 min
      if (durationMinutes > 480) durationMinutes = 480; // max 8 hours
    }
    
    // Each hour = 48px (h-12)
    const heightPx = (durationMinutes / 60) * 48;
    
    return { top: `${topPercent}%`, height: `${heightPx}px` };
  };

  return (
    <div className="flex flex-col">
      {/* Scrollable container that includes both header and grid */}
      <div className="overflow-auto max-h-[650px]">
        {/* Day headers - sticky at top */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 bg-card z-10">
          <div className="p-2" /> {/* Empty corner */}
          {days.map(day => (
            <div 
              key={day.toISOString()} 
              className={cn(
                "p-2 text-center border-l",
                isSameDay(day, new Date()) && "bg-primary/10"
              )}
            >
              <div className="text-sm font-medium">{format(day, 'EEE')}</div>
              <div className={cn(
                "text-lg",
                isSameDay(day, new Date()) && "text-primary font-bold"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Hours column */}
          <div className="relative">
            {HOURS.map(hour => (
              <div 
                key={hour} 
                className="h-12 border-b text-xs text-muted-foreground pr-2 text-right flex items-start justify-end pt-0.5"
              >
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayHearings = hearingsByDate.get(dateKey) || [];
            
            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "relative border-l",
                  isSameDay(day, new Date()) && "bg-primary/5"
                )}
              >
                {/* Hour grid lines */}
                {HOURS.map(hour => (
                  <div key={hour} className="h-12 border-b border-dashed border-muted" />
                ))}
                
                {/* Hearings positioned by time */}
                {dayHearings.map(hearing => {
                  const hearingDate = new Date(hearing.scheduled_date);
                  const hour = getHours(hearingDate);
                  
                  // Only show if within visible hours
                  if (hour < HOUR_START || hour > HOUR_END) return null;
                  
                  const position = getHearingPosition(hearing);
                  const urgency = getHearingUrgency(hearing);
                  const clientName = hearing.litigation_matter?.client_service?.primary_client
                    ? `${hearing.litigation_matter.client_service.primary_client.first_name} ${hearing.litigation_matter.client_service.primary_client.last_name}`
                    : 'Unknown';
                  
                  return (
                    <Popover key={hearing.id}>
                      <PopoverTrigger asChild>
                        <button
                          className={cn(
                            "absolute left-0.5 right-0.5 px-1 py-0.5 rounded text-xs overflow-hidden cursor-pointer hover:opacity-90 transition-opacity text-left",
                            urgencyColors[urgency]
                          )}
                          style={{ top: position.top, minHeight: position.height }}
                        >
                          <div className="font-medium truncate">
                            {format(hearingDate, 'h:mm a')}
                          </div>
                          <div className="truncate opacity-90">
                            {hearing.hearing_type}
                          </div>
                          <div className="truncate text-[10px] opacity-75">
                            {clientName}
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-3" align="start">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold">{hearing.hearing_type}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(hearingDate, 'EEEE, MMMM d, yyyy')} at {format(hearingDate, 'h:mm a')}
                                {hearing.end_date && (
                                  <> - {format(new Date(hearing.end_date), 'h:mm a')}</>
                                )}
                              </p>
                            </div>
                            <Badge variant="outline" className="shrink-0">
                              {hearing.litigation_matter?.case_number || 'No Case #'}
                            </Badge>
                          </div>
                          <div className="text-sm">
                            <p><strong>Client:</strong> {clientName}</p>
                            <p><strong>vs:</strong> {hearing.litigation_matter?.opposing_party || 'Unknown'}</p>
                            {hearing.location && <p><strong>Location:</strong> {hearing.location}</p>}
                            {hearing.judge_name && <p><strong>Judge:</strong> {hearing.judge_name}</p>}
                            {hearing.litigation_matter?.court_name && (
                              <p><strong>Court:</strong> {hearing.litigation_matter.court_name}</p>
                            )}
                          </div>
                          {hearing.notes && (
                            <p className="text-xs text-muted-foreground border-t pt-2">
                              {hearing.notes}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex-1"
                              onClick={() => onEditHearing(hearing)}
                            >
                              <Pencil className="h-3 w-3 mr-2" />
                              Edit
                            </Button>
                            {hearing.litigation_matter?.id && (
                              <Button 
                                size="sm" 
                                className="flex-1"
                                onClick={() => onOpenMatter(hearing.litigation_matter!.id)}
                              >
                                <ExternalLink className="h-3 w-3 mr-2" />
                                View Matter
                              </Button>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CourtCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [courtFilter, setCourtFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [attorneyFilter, setAttorneyFilter] = useState<string>('all');
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  const [editingHearing, setEditingHearing] = useState<HearingWithMatter | null>(null);

  const handleOpenMatter = (matterId: string) => {
    setSelectedMatterId(matterId);
  };

  const handleEditHearing = (hearing: HearingWithMatter) => {
    setEditingHearing(hearing);
  };

  const { data: hearings, isLoading } = useAllHearings();
  const { data: courts } = useUniqueCourts();
  const { data: hearingTypes } = useHearingTypes();
  const { data: staff } = useStaff();

  // Filter attorneys (department = attorney)
  const attorneys = useMemo(() => 
    staff?.filter(s => s.department === 'attorney') || [],
    [staff]
  );

  // Filter hearings based on selected filters
  const filteredHearings = useMemo(() => {
    if (!hearings) return [];
    
    return hearings.filter(hearing => {
      if (courtFilter !== 'all' && hearing.litigation_matter?.court_name !== courtFilter) {
        return false;
      }
      if (typeFilter !== 'all' && hearing.hearing_type !== typeFilter) {
        return false;
      }
      // Attorney filter would require joining assignments - simplified for now
      return true;
    });
  }, [hearings, courtFilter, typeFilter, attorneyFilter]);

  // Group hearings by date
  const hearingsByDate = useMemo(() => {
    const map = new Map<string, HearingWithMatter[]>();
    filteredHearings.forEach(hearing => {
      const dateKey = format(new Date(hearing.scheduled_date), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(hearing);
    });
    return map;
  }, [filteredHearings]);

  // Get days to display based on view mode
  const displayDays = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, viewMode]);

  const navigatePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    }
  };

  const selectedDateHearings = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return hearingsByDate.get(dateKey) || [];
  }, [selectedDate, hearingsByDate]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {viewMode === 'month' 
              ? format(currentDate, 'MMMM yyyy')
              : `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`
            }
          </h2>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => exportToICal(filteredHearings.filter(h => isFuture(new Date(h.scheduled_date))))}
          >
            <Download className="h-4 w-4 mr-2" />
            Export iCal
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        
        <Select value={courtFilter} onValueChange={setCourtFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Courts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courts</SelectItem>
            {courts?.map(court => (
              <SelectItem key={court} value={court}>{court}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {hearingTypes?.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={attorneyFilter} onValueChange={setAttorneyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Attorneys" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Attorneys</SelectItem>
            {attorneys.map(atty => (
              <SelectItem key={atty.id} value={atty.id}>
                {atty.first_name} {atty.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {viewMode === 'week' ? (
            <WeekViewGrid 
              days={displayDays} 
              hearingsByDate={hearingsByDate}
              currentDate={currentDate}
              onOpenMatter={handleOpenMatter}
              onEditHearing={handleEditHearing}
            />
          ) : (
            <>
              {/* Day Headers */}
              <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {displayDays.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayHearings = hearingsByDate.get(dateKey) || [];
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  // Determine most urgent hearing for color coding
                  const mostUrgent = dayHearings.length > 0
                    ? dayHearings.reduce((prev, curr) => {
                        const urgencyOrder = ['urgent', 'soon', 'needs_outcome', 'normal', 'completed'];
                        const prevIdx = urgencyOrder.indexOf(getHearingUrgency(prev));
                        const currIdx = urgencyOrder.indexOf(getHearingUrgency(curr));
                        return currIdx < prevIdx ? curr : prev;
                      })
                    : null;

                  const urgency = mostUrgent ? getHearingUrgency(mostUrgent) : null;

                  return (
                    <Popover key={dateKey}>
                      <PopoverTrigger asChild>
                        <button
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            'min-h-[80px] p-2 rounded-md border text-left transition-colors',
                            'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary',
                            !isCurrentMonth && 'opacity-40',
                            isToday && 'border-primary border-2',
                            isSelected && 'bg-accent'
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <span className={cn(
                              'text-sm',
                              isToday && 'font-bold text-primary'
                            )}>
                              {format(day, 'd')}
                            </span>
                            {dayHearings.length > 0 && (
                              <Badge 
                                className={cn('text-xs px-1.5 py-0', urgency && urgencyColors[urgency])}
                              >
                                {dayHearings.length}
                              </Badge>
                            )}
                          </div>
                          {dayHearings.slice(0, 2).map(h => (
                            <div 
                              key={h.id} 
                              className={cn(
                                'text-xs mt-1 px-1 py-0.5 rounded truncate',
                                urgencyColors[getHearingUrgency(h)]
                              )}
                            >
                              {format(new Date(h.scheduled_date), 'h:mm a')} - {h.hearing_type}
                            </div>
                          ))}
                          {dayHearings.length > 2 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              +{dayHearings.length - 2} more
                            </div>
                          )}
                        </button>
                      </PopoverTrigger>
                      {dayHearings.length > 0 && (
                        <PopoverContent className="w-80 p-0" align="start">
                          <div className="p-3 border-b">
                            <h4 className="font-semibold">{format(day, 'EEEE, MMMM d, yyyy')}</h4>
                            <p className="text-sm text-muted-foreground">{dayHearings.length} hearing(s)</p>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto p-2 space-y-2">
                            {dayHearings
                              .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
                              .map(hearing => {
                                const clientName = hearing.litigation_matter?.client_service?.primary_client
                                  ? `${hearing.litigation_matter.client_service.primary_client.first_name} ${hearing.litigation_matter.client_service.primary_client.last_name}`
                                  : 'Unknown';
                                
                                return (
                                  <div 
                                    key={hearing.id} 
                                    className={cn(
                                      'p-2 rounded border-l-4',
                                      urgencyColors[getHearingUrgency(hearing)].includes('destructive') 
                                        ? 'border-l-destructive bg-destructive/5' 
                                        : urgencyColors[getHearingUrgency(hearing)].includes('yellow')
                                        ? 'border-l-yellow-500 bg-yellow-50'
                                        : 'border-l-primary bg-primary/5'
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm">{hearing.hearing_type}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {clientName} vs {hearing.litigation_matter?.opposing_party || 'Unknown'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {format(new Date(hearing.scheduled_date), 'h:mm a')}
                                          {hearing.location && ` • ${hearing.location}`}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-xs shrink-0">
                                          {hearing.litigation_matter?.case_number || 'No Case #'}
                                        </Badge>
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          className="h-6 w-6 p-0"
                                          onClick={() => handleEditHearing(hearing)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        {hearing.litigation_matter?.id && (
                                          <Button 
                                            size="sm" 
                                            variant="ghost"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => handleOpenMatter(hearing.litigation_matter!.id)}
                                          >
                                            <ExternalLink className="h-3 w-3 mr-1" />
                                            View
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </PopoverContent>
                      )}
                    </Popover>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-muted-foreground">Legend:</span>
        <div className="flex items-center gap-1">
          <div className={cn('w-3 h-3 rounded', urgencyColors.urgent.split(' ')[0])} />
          <span>Within 7 days</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn('w-3 h-3 rounded', urgencyColors.soon.split(' ')[0])} />
          <span>Within 14 days</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn('w-3 h-3 rounded', urgencyColors.normal.split(' ')[0])} />
          <span>Future</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn('w-3 h-3 rounded', urgencyColors.needs_outcome.split(' ')[0])} />
          <span>Needs outcome</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn('w-3 h-3 rounded', urgencyColors.completed.split(' ')[0])} />
          <span>Completed</span>
        </div>
      </div>

      {/* Matter Detail Sheet */}
      <LitigationMatterDetailSheet
        matterId={selectedMatterId}
        open={!!selectedMatterId}
        onOpenChange={(open) => !open && setSelectedMatterId(null)}
      />

      {/* Hearing Edit Dialog */}
      {editingHearing && (
        <LitigationHearingFormDialog
          matterId={editingHearing.matter_id}
          hearing={{
            id: editingHearing.id,
            matter_id: editingHearing.matter_id,
            hearing_type: editingHearing.hearing_type,
            scheduled_date: editingHearing.scheduled_date,
            end_date: editingHearing.end_date,
            location: editingHearing.location,
            judge_name: editingHearing.judge_name,
            outcome: editingHearing.outcome,
            notes: editingHearing.notes,
            created_at: editingHearing.created_at,
            updated_at: editingHearing.updated_at,
          }}
          open={!!editingHearing}
          onOpenChange={(open) => !open && setEditingHearing(null)}
        />
      )}
    </div>
  );
}
