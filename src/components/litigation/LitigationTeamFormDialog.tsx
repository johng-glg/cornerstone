import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateLitigationTeam, useUpdateLitigationTeam } from '@/hooks/useLitigationTeams';
import type { LitigationTeam } from '@/types/litigationTeams';

interface LitigationTeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: LitigationTeam | null;
}

const TEAM_COLORS = [
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
];

export function LitigationTeamFormDialog({
  open,
  onOpenChange,
  team,
}: LitigationTeamFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('gray');

  const createTeam = useCreateLitigationTeam();
  const updateTeam = useUpdateLitigationTeam();

  const isEditing = !!team;
  const isPending = createTeam.isPending || updateTeam.isPending;

  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description || '');
      setColor(team.color || 'gray');
    } else {
      setName('');
      setDescription('');
      setColor('gray');
    }
  }, [team, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && team) {
      await updateTeam.mutateAsync({
        id: team.id,
        name,
        description: description || null,
        color,
      });
    } else {
      await createTeam.mutateAsync({
        name,
        description: description || undefined,
        color,
      });
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Team' : 'Create New Team'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              placeholder="e.g., California Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this team..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Team Color</Label>
            <div className="flex flex-wrap gap-2">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`h-8 w-8 rounded-full ${c.class} transition-all ${
                    color === c.value
                      ? 'ring-2 ring-offset-2 ring-primary'
                      : 'hover:scale-110'
                  }`}
                  onClick={() => setColor(c.value)}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
