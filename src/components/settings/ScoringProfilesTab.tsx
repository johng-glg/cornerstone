import { useState } from 'react';
import { useScoringProfiles, useDeleteScoringProfile, useSetDefaultProfile } from '@/hooks/useScoringProfiles';
import { ScoringProfileFormDialog } from './ScoringProfileFormDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Pencil, Trash2, Star, Target } from 'lucide-react';
import type { ScoringProfile } from '@/types/scoring';

export function ScoringProfilesTab() {
  const { data: profiles, isLoading } = useScoringProfiles();
  const deleteProfile = useDeleteScoringProfile();
  const setDefault = useSetDefaultProfile();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ScoringProfile | null>(null);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deletingProfileId) return;
    await deleteProfile.mutateAsync(deletingProfileId);
    setDeletingProfileId(null);
  };

  const handleSetDefault = async (profileId: string) => {
    await setDefault.mutateAsync(profileId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Lead Scoring Profiles</h3>
          <p className="text-sm text-muted-foreground">
            Configure scoring criteria for lead prioritization
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Profile
        </Button>
      </div>

      {profiles?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="font-semibold mb-1">No scoring profiles</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first scoring profile to start prioritizing leads
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {profiles?.map((profile) => (
            <Card key={profile.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{profile.name}</CardTitle>
                      {profile.is_default && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" />
                          Default
                        </Badge>
                      )}
                      <Badge variant={profile.is_active ? 'default' : 'outline'}>
                        {profile.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {profile.description && (
                      <CardDescription>{profile.description}</CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingProfile(profile)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {!profile.is_default && (
                        <DropdownMenuItem onClick={() => handleSetDefault(profile.id)}>
                          <Star className="mr-2 h-4 w-4" />
                          Set as Default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeletingProfileId(profile.id)}
                        className="text-destructive focus:text-destructive"
                        disabled={profile.is_default}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {profile.interest_type && (
                    <Badge variant="outline" className="capitalize">
                      {profile.interest_type.replace('_', ' ')}
                    </Badge>
                  )}
                  {profile.source && (
                    <Badge variant="outline" className="capitalize">
                      Source: {profile.source.replace('_', ' ')}
                    </Badge>
                  )}
                  {!profile.interest_type && !profile.source && (
                    <span>Applies to all leads</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ScoringProfileFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <ScoringProfileFormDialog
        open={!!editingProfile}
        onOpenChange={(open) => !open && setEditingProfile(null)}
        profile={editingProfile ?? undefined}
      />

      <AlertDialog open={!!deletingProfileId} onOpenChange={(open) => !open && setDeletingProfileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scoring Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Leads using this profile will fall back to the default profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
