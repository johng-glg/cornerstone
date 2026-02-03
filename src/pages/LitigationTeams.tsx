import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users, Settings, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useLitigationTeams,
  useLitigationTeamMembers,
  useEligibleLitigationStaff,
  useMoveStaffToTeam,
  useRemoveFromTeam,
} from '@/hooks/useLitigationTeams';
import { LitigationTeamFormDialog } from '@/components/litigation/LitigationTeamFormDialog';
import { LitigationTeamMemberCard } from '@/components/litigation/LitigationTeamMemberCard';
import { sortByRoleHierarchy, type LitigationTeam } from '@/types/litigationTeams';
import { cn } from '@/lib/utils';

const TEAM_COLOR_CLASSES: Record<string, string> = {
  gray: 'border-t-gray-500',
  red: 'border-t-red-500',
  orange: 'border-t-orange-500',
  yellow: 'border-t-yellow-500',
  green: 'border-t-green-500',
  blue: 'border-t-blue-500',
  purple: 'border-t-purple-500',
  pink: 'border-t-pink-500',
};

export default function LitigationTeamsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<LitigationTeam | null>(null);

  const { data: teams = [], isLoading: teamsLoading } = useLitigationTeams();
  const { data: teamMembers = [], isLoading: membersLoading } = useLitigationTeamMembers();
  const { data: eligibleStaff = [], isLoading: staffLoading } = useEligibleLitigationStaff();
  
  const moveStaff = useMoveStaffToTeam();
  const removeFromTeam = useRemoveFromTeam();

  const isLoading = teamsLoading || membersLoading || staffLoading;

  // Group members by team
  const membersByTeam = useMemo(() => {
    const grouped: Record<string, typeof teamMembers> = {};
    teams.forEach((team) => {
      grouped[team.id] = teamMembers.filter((m) => m.team_id === team.id);
    });
    return grouped;
  }, [teams, teamMembers]);

  // Find unassigned staff (eligible but not in any team)
  const assignedStaffIds = useMemo(
    () => new Set(teamMembers.map((m) => m.staff_id)),
    [teamMembers]
  );

  const unassignedStaff = useMemo(
    () => eligibleStaff.filter((s) => !assignedStaffIds.has(s.id)),
    [eligibleStaff, assignedStaffIds]
  );

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const targetTeamId = destination.droppableId === 'unassigned' ? null : destination.droppableId;
    
    moveStaff.mutate({
      staffId: draggableId,
      targetTeamId,
    });
  };

  const handleRemoveFromTeam = (staffId: string) => {
    removeFromTeam.mutate(staffId);
  };

  const handleEditTeam = (team: LitigationTeam) => {
    setEditingTeam(team);
    setDialogOpen(true);
  };

  const handleCreateTeam = () => {
    setEditingTeam(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b px-6 py-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex-1 p-6">
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96 w-72" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/litigation">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6" />
                Legal Teams
              </h1>
              <p className="text-muted-foreground">
                Organize litigation staff into teams for matter assignment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Manage in Settings
              </Button>
            </Link>
            <Button onClick={handleCreateTeam}>
              <Plus className="h-4 w-4 mr-2" />
              New Team
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-h-full">
            {/* Team Columns */}
            {teams.filter(t => t.is_active).map((team) => {
              const members = membersByTeam[team.id] || [];
              const sortedMembers = sortByRoleHierarchy(members);

              return (
                <Card
                  key={team.id}
                  className={cn(
                    'w-72 flex-shrink-0 border-t-4',
                    TEAM_COLOR_CLASSES[team.color || 'gray']
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">{team.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleEditTeam(team)}
                      >
                        Edit
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {members.length} member{members.length !== 1 ? 's' : ''}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Droppable droppableId={team.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            'min-h-[200px] space-y-2 rounded-lg p-2 transition-colors',
                            snapshot.isDraggingOver && 'bg-muted/50'
                          )}
                        >
                          {sortedMembers.map((member, index) => (
                            <LitigationTeamMemberCard
                              key={member.staff_id}
                              staff={member.staff}
                              index={index}
                              onRemove={() => handleRemoveFromTeam(member.staff_id)}
                            />
                          ))}
                          {provided.placeholder}
                          {members.length === 0 && !snapshot.isDraggingOver && (
                            <p className="text-center text-sm text-muted-foreground py-8">
                              Drag staff here to assign
                            </p>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              );
            })}

            {/* Unassigned Column */}
            <Card className="w-72 flex-shrink-0 border-t-4 border-t-muted-foreground/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Unassigned</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {unassignedStaff.length} member{unassignedStaff.length !== 1 ? 's' : ''}
                </p>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="unassigned">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'min-h-[200px] space-y-2 rounded-lg p-2 transition-colors',
                        snapshot.isDraggingOver && 'bg-muted/50'
                      )}
                    >
                      {unassignedStaff.map((staff, index) => (
                        <LitigationTeamMemberCard
                          key={staff.id}
                          staff={staff}
                          index={index}
                          showRemove={false}
                        />
                      ))}
                      {provided.placeholder}
                      {unassignedStaff.length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-center text-sm text-muted-foreground py-8">
                          All eligible staff assigned
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>

            {/* Empty State - No Teams */}
            {teams.filter(t => t.is_active).length === 0 && (
              <Card className="w-72 flex-shrink-0 border-dashed">
                <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">No teams created yet</p>
                  <Button onClick={handleCreateTeam}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Team
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </DragDropContext>
      </div>

      {/* Form Dialog */}
      <LitigationTeamFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        team={editingTeam}
      />
    </div>
  );
}
