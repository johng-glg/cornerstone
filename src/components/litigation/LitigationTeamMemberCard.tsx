import { Draggable } from '@hello-pangea/dnd';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ROLE_CONFIG, type EligibleDepartment } from '@/types/litigationTeams';
import { cn } from '@/lib/utils';

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  department: string;
  job_title: string | null;
  avatar_url: string | null;
}

interface LitigationTeamMemberCardProps {
  staff: StaffMember;
  index: number;
  onRemove?: () => void;
  showRemove?: boolean;
}

export function LitigationTeamMemberCard({
  staff,
  index,
  onRemove,
  showRemove = true,
}: LitigationTeamMemberCardProps) {
  const roleConfig = ROLE_CONFIG[staff.department as EligibleDepartment];
  const initials = `${staff.first_name[0]}${staff.last_name[0]}`.toUpperCase();

  return (
    <Draggable draggableId={staff.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'group relative flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-shadow',
            snapshot.isDragging && 'shadow-lg ring-2 ring-primary/20'
          )}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={staff.avatar_url || undefined} alt={`${staff.first_name} ${staff.last_name}`} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {staff.first_name} {staff.last_name}
            </p>
            {roleConfig && (
              <Badge
                variant="secondary"
                className={cn('mt-1 text-xs', roleConfig.bgColor, roleConfig.color)}
              >
                {roleConfig.label}
              </Badge>
            )}
          </div>

          {showRemove && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 -right-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </Draggable>
  );
}
