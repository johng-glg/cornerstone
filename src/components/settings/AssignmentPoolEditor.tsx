import { useState } from 'react';
import { useAssignmentPool, useAddPoolMember, useUpdatePoolMember, useRemovePoolMember } from '@/hooks/useAssignmentPool';
import { useStaff } from '@/hooks/useStaff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Users } from 'lucide-react';
import type { AssignmentMethod } from '@/types/assignment';

interface AssignmentPoolEditorProps {
  ruleId: string;
  method: AssignmentMethod;
}

export function AssignmentPoolEditor({ ruleId, method }: AssignmentPoolEditorProps) {
  const { data: pool, isLoading: poolLoading } = useAssignmentPool(ruleId);
  const { data: allStaff, isLoading: staffLoading } = useStaff('sales');
  const addMember = useAddPoolMember();
  const updateMember = useUpdatePoolMember();
  const removeMember = useRemovePoolMember();

  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  const poolStaffIds = pool?.map(p => p.staff_id) || [];
  const availableStaff = allStaff?.filter(s => !poolStaffIds.includes(s.id)) || [];

  const handleAddMember = () => {
    if (!selectedStaffId) return;
    addMember.mutate({
      rule_id: ruleId,
      staff_id: selectedStaffId,
      weight: 10,
      max_active_leads: 25,
      is_available: true,
    });
    setSelectedStaffId('');
  };

  if (poolLoading || staffLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignment Pool
          </h4>
          <p className="text-sm text-muted-foreground">
            Staff members who can receive leads from this rule
          </p>
        </div>
      </div>

      {/* Add Member */}
      <div className="flex items-center gap-2">
        <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select staff to add..." />
          </SelectTrigger>
          <SelectContent>
            {availableStaff.length === 0 ? (
              <SelectItem value="__none__" disabled>No available staff</SelectItem>
            ) : (
              availableStaff.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleAddMember} 
          disabled={!selectedStaffId || addMember.isPending}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Pool Members Table */}
      {pool?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          No members in this pool yet. Add staff members above.
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                {method === 'weighted' && <TableHead className="w-24">Weight</TableHead>}
                <TableHead className="w-24">Max Leads</TableHead>
                <TableHead className="w-20">Available</TableHead>
                <TableHead className="w-16">Count</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pool?.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.staff?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {member.staff?.first_name?.[0]}{member.staff?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {member.staff?.first_name} {member.staff?.last_name}
                      </span>
                    </div>
                  </TableCell>
                  {method === 'weighted' && (
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        defaultValue={member.weight}
                        onBlur={(e) => updateMember.mutate({
                          id: member.id,
                          weight: parseInt(e.currentTarget.value) || 10,
                        })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateMember.mutate({
                              id: member.id,
                              weight: parseInt(e.currentTarget.value) || 10,
                            });
                          }
                        }}
                        className="h-8 w-20"
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      defaultValue={member.max_active_leads || 25}
                      onBlur={(e) => updateMember.mutate({
                        id: member.id,
                        max_active_leads: parseInt(e.currentTarget.value) || 25,
                      })}
                      className="h-8 w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={member.is_available}
                      onCheckedChange={(checked) => updateMember.mutate({
                        id: member.id,
                        is_available: checked,
                      })}
                    />
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {member.assignment_count}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeMember.mutate(member.id)}
                      disabled={removeMember.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
