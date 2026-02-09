import { Users, Plus, X, Building2, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useMatterAssignments, useUnassignStaffFromMatter, type MatterAssignment } from '@/hooks/useMatterAssignments';

interface OpposingCounselInfo {
  lawFirmName?: string | null;
  contactName?: string | null;
  contactTitle?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

interface MatterTeamPanelProps {
  matterId: string;
  onAddAssignment: () => void;
  opposingCounsel?: OpposingCounselInfo;
}

const assignmentTypeLabels: Record<string, string> = {
  litigation_attorney: 'Lead Attorney',
  case_manager: 'Case Manager',
  negotiator: 'Negotiator',
  sales_rep: 'Sales Rep',
  lead_processor: 'Lead Processor',
};

const assignmentTypeBadgeColors: Record<string, string> = {
  litigation_attorney: 'bg-purple-100 text-purple-700',
  case_manager: 'bg-blue-100 text-blue-700',
  negotiator: 'bg-green-100 text-green-700',
  sales_rep: 'bg-orange-100 text-orange-700',
  lead_processor: 'bg-teal-100 text-teal-700',
};

export function MatterTeamPanel({ matterId, onAddAssignment, opposingCounsel }: MatterTeamPanelProps) {
  const { data: assignments, isLoading } = useMatterAssignments(matterId);
  const unassign = useUnassignStaffFromMatter();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const handleUnassign = (assignment: MatterAssignment) => {
    const staffName = assignment.staff
      ? `${assignment.staff.first_name} ${assignment.staff.last_name}`
      : undefined;
    unassign.mutate({
      assignmentId: assignment.id,
      matterId,
      staffName,
      assignmentType: assignment.assignment_type,
    });
  };

  const hasOpposingCounsel = opposingCounsel?.lawFirmName || opposingCounsel?.contactName;

  return (
    <div className="space-y-6">
      {/* Opposing Counsel Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Opposing Counsel</h3>
        {hasOpposingCounsel ? (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Building2 className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 space-y-1">
                  {opposingCounsel?.lawFirmName && (
                    <p className="font-medium">{opposingCounsel.lawFirmName}</p>
                  )}
                  {opposingCounsel?.contactName && (
                    <div className="flex items-center gap-2 text-sm">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span>{opposingCounsel.contactName}</span>
                      {opposingCounsel.contactTitle && (
                        <Badge variant="outline" className="text-xs">
                          {opposingCounsel.contactTitle}
                        </Badge>
                      )}
                    </div>
                  )}
                  {(opposingCounsel?.contactEmail || opposingCounsel?.contactPhone) && (
                    <div className="text-sm text-muted-foreground">
                      {opposingCounsel.contactEmail && <span>{opposingCounsel.contactEmail}</span>}
                      {opposingCounsel.contactEmail && opposingCounsel.contactPhone && <span> • </span>}
                      {opposingCounsel.contactPhone && <span>{opposingCounsel.contactPhone}</span>}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
            <Building2 className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No opposing counsel assigned</p>
            <p className="text-xs mt-1">Edit the matter to add opposing counsel</p>
          </div>
        )}
      </div>

      {/* Our Team Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Our Team</h3>
          <Button variant="outline" size="sm" onClick={onAddAssignment}>
            <Plus className="h-4 w-4 mr-1" />
            Assign Staff
          </Button>
        </div>

        {assignments && assignments.length > 0 ? (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onRemove={() => handleUnassign(assignment)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No team members assigned</p>
            <p className="text-sm mt-1">Add staff to manage this matter</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AssignmentCard({ 
  assignment, 
  onRemove 
}: { 
  assignment: MatterAssignment; 
  onRemove: () => void;
}) {
  const staff = assignment.staff;
  if (!staff) return null;

  const initials = `${staff.first_name[0]}${staff.last_name[0]}`.toUpperCase();
  const colorClass = assignmentTypeBadgeColors[assignment.assignment_type] || 'bg-gray-100 text-gray-700';

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback className="bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{staff.first_name} {staff.last_name}</p>
          {staff.job_title && (
            <p className="text-sm text-muted-foreground">{staff.job_title}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={colorClass}>
          {assignmentTypeLabels[assignment.assignment_type] || assignment.assignment_type}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(assignment.id)}
          className="h-8 w-8"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
