import { format, isPast, differenceInDays, isFuture } from 'date-fns';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Deadline {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  type: 'response' | 'hearing' | 'deadline';
  entityId?: string;
  entityType?: string;
}

interface DeadlinesListProps {
  title?: string;
  description?: string;
  deadlines: Deadline[];
  viewAllHref?: string;
  maxItems?: number;
  emptyMessage?: string;
}

function getUrgencyStyle(date: string) {
  const deadlineDate = new Date(date);
  const daysUntil = differenceInDays(deadlineDate, new Date());

  if (isPast(deadlineDate)) {
    return { 
      badge: 'bg-destructive text-destructive-foreground', 
      text: 'text-destructive',
      label: 'Overdue'
    };
  }
  if (daysUntil <= 3) {
    return { 
      badge: 'bg-destructive text-destructive-foreground', 
      text: 'text-destructive font-medium',
      label: 'Urgent'
    };
  }
  if (daysUntil <= 7) {
    return { 
      badge: 'bg-yellow-100 text-yellow-800', 
      text: 'text-yellow-700',
      label: 'Soon'
    };
  }
  return { 
    badge: 'bg-secondary text-secondary-foreground', 
    text: 'text-muted-foreground',
    label: null
  };
}

const typeIcons = {
  response: <Clock className="h-4 w-4" />,
  hearing: <Calendar className="h-4 w-4" />,
  deadline: <AlertTriangle className="h-4 w-4" />,
};

export function DeadlinesList({
  title = 'Upcoming Deadlines',
  description,
  deadlines,
  viewAllHref,
  maxItems = 5,
  emptyMessage = 'No upcoming deadlines',
}: DeadlinesListProps) {
  const sortedDeadlines = [...deadlines]
    .filter(d => isFuture(new Date(d.date)) || differenceInDays(new Date(), new Date(d.date)) <= 1)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, maxItems);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {sortedDeadlines.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-3">
            {sortedDeadlines.map((deadline) => {
              const urgency = getUrgencyStyle(deadline.date);
              return (
                <div
                  key={deadline.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-muted-foreground">
                      {typeIcons[deadline.type]}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{deadline.title}</p>
                      {deadline.subtitle && (
                        <p className="text-xs text-muted-foreground">{deadline.subtitle}</p>
                      )}
                      <p className={cn('text-xs', urgency.text)}>
                        {format(new Date(deadline.date), 'MMM d, yyyy')}
                        {deadline.type === 'hearing' && (
                          <span className="ml-1">
                            at {format(new Date(deadline.date), 'h:mm a')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {urgency.label && (
                    <Badge className={urgency.badge}>{urgency.label}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {viewAllHref && (
          <Button variant="outline" className="w-full mt-4" asChild>
            <Link to={viewAllHref}>View All</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
