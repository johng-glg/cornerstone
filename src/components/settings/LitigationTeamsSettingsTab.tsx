import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useLitigationTeams, useLitigationTeamMembers, useUpdateLitigationTeam, useDeleteLitigationTeam } from '@/hooks/useLitigationTeams';
import { LitigationTeamFormDialog } from '@/components/litigation/LitigationTeamFormDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { LitigationTeam } from '@/types/litigationTeams';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const TEAM_COLOR_BADGES: Record<string, string> = {
  gray: 'bg-gray-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
};

export function LitigationTeamsSettingsTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<LitigationTeam | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<LitigationTeam | null>(null);

  const { data: teams = [], isLoading } = useLitigationTeams();
  const { data: members = [] } = useLitigationTeamMembers();
  const updateTeam = useUpdateLitigationTeam();
  const deleteTeam = useDeleteLitigationTeam();

  const getMemberCount = (teamId: string) => 
    members.filter((m) => m.team_id === teamId).length;

  const handleCreate = () => {
    setEditingTeam(null);
    setDialogOpen(true);
  };

  const handleEdit = (team: LitigationTeam) => {
    setEditingTeam(team);
    setDialogOpen(true);
  };

  const handleToggleActive = (team: LitigationTeam) => {
    updateTeam.mutate({
      id: team.id,
      is_active: !team.is_active,
    });
  };

  const handleDeleteClick = (team: LitigationTeam) => {
    setTeamToDelete(team);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (teamToDelete) {
      deleteTeam.mutate(teamToDelete.id);
      setDeleteConfirmOpen(false);
      setTeamToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Legal Teams
              </CardTitle>
              <CardDescription>
                Manage litigation teams for matter assignment. Staff with Attorney, Case Manager, or Negotiator roles can be assigned to teams.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/litigation/teams">
                <Button variant="outline">View Kanban</Button>
              </Link>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Team
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading teams...</p>
          ) : teams.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No legal teams created yet</p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Team
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Color</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Members</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>
                      <div
                        className={cn(
                          'h-4 w-4 rounded-full',
                          TEAM_COLOR_BADGES[team.color || 'gray']
                        )}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {team.description || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{getMemberCount(team.id)}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={team.is_active}
                        onCheckedChange={() => handleToggleActive(team)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(team)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(team)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LitigationTeamFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        team={editingTeam}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{teamToDelete?.name}"? This will unassign all members from this team. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
