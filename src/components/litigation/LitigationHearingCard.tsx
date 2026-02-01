import { Calendar, MapPin, User, CheckCircle, Clock, Trash2, Edit } from 'lucide-react';
import { format, isPast, isFuture } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { LitigationHearing } from '@/hooks/useLitigationHearings';

interface LitigationHearingCardProps {
  hearing: LitigationHearing;
  onEdit: (hearing: LitigationHearing) => void;
  onDelete: (hearingId: string) => void;
}

const hearingTypeLabels: Record<string, string> = {
  status_conference: 'Status Conference',
  motion_hearing: 'Motion Hearing',
  trial: 'Trial',
  deposition: 'Deposition',
  mediation: 'Mediation',
};

export function LitigationHearingCard({ hearing, onEdit, onDelete }: LitigationHearingCardProps) {
  const scheduledDate = new Date(hearing.scheduled_date);
  const isUpcoming = isFuture(scheduledDate);
  const isPastEvent = isPast(scheduledDate);

  return (
    <Card className={isPastEvent && !hearing.outcome ? 'border-yellow-200' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">
                {hearingTypeLabels[hearing.hearing_type] || hearing.hearing_type}
              </h4>
              {isUpcoming && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Upcoming
                </Badge>
              )}
              {hearing.outcome && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
              {isPastEvent && !hearing.outcome && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Needs Outcome
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(hearing)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(hearing.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(scheduledDate, 'MMM d, yyyy h:mm a')}</span>
          </div>
          {hearing.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{hearing.location}</span>
            </div>
          )}
          {hearing.judge_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Judge {hearing.judge_name}</span>
            </div>
          )}
        </div>

        {hearing.outcome && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm">
              <span className="font-medium">Outcome:</span> {hearing.outcome}
            </p>
          </div>
        )}

        {hearing.notes && (
          <p className="mt-2 text-sm text-muted-foreground">{hearing.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
