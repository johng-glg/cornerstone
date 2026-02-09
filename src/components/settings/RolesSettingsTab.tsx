import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, UserPlus, X, Shield, Users, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useRolePermissions,
  useRoleSpecialPermissions,
  useUpsertRolePermission,
  useAddSpecialPermission,
  useDeleteSpecialPermission,
  useRoleMembers,
  useAddRoleMember,
  useRemoveRoleMember,
  useRoleMemberCounts,
  type RolePermissionRow,
} from '@/hooks/useRolePermissions';
import { useStaff } from '@/hooks/useStaff';
import { roleToDepartment, DEPARTMENT_LABELS, DEPARTMENT_COLORS } from '@/lib/staffDepartments';
import type { Enums } from '@/integrations/supabase/types';

const ALL_ROLES: { value: Enums<'app_role'>; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'attorney', label: 'Attorney' },
  { value: 'paralegal', label: 'Paralegal' },
  { value: 'case_manager', label: 'Case Manager' },
  { value: 'negotiator', label: 'Negotiator' },
  { value: 'sales_rep', label: 'Sales Rep' },
  { value: 'client_services_rep', label: 'Client Services' },
  { value: 'payment_processor', label: 'Payment Processor' },
  { value: 'correspondent', label: 'Correspondent' },
  { value: 'of_counsel', label: 'Of Counsel' },
  { value: 'viewer', label: 'Viewer' },
];

const MODULES = [
  'Dashboard', 'Leads', 'Clients', 'Services', 'Liabilities',
  'Settlements', 'Litigation', 'Tasks', 'Reports', 'Creditors',
  'Companies', 'Staff', 'Payments', 'Settings',
];

export function RolesSettingsTab() {
  const [selectedRole, setSelectedRole] = useState<Enums<'app_role'>>('admin');
  const [newPermission, setNewPermission] = useState('');
  const [showAddPermission, setShowAddPermission] = useState(false);
  const [staffSearchOpen, setStaffSearchOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');

  const { data: permissions = [], isLoading: loadingPerms } = useRolePermissions();
  const { data: specialPerms = [] } = useRoleSpecialPermissions();
  const { data: memberCounts = {} } = useRoleMemberCounts();
  const { data: members = [], isLoading: loadingMembers } = useRoleMembers(selectedRole);
  const { data: allStaff = [] } = useStaff();

  const upsertPermission = useUpsertRolePermission();
  const addSpecialPerm = useAddSpecialPermission();
  const deleteSpecialPerm = useDeleteSpecialPermission();
  const addMember = useAddRoleMember();
  const removeMember = useRemoveRoleMember();

  const rolePerms = permissions.filter(p => p.role === selectedRole);
  const roleSpecialPerms = specialPerms.filter(p => p.role === selectedRole);

  const roleInfo = ALL_ROLES.find(r => r.value === selectedRole);
  const department = roleToDepartment[selectedRole];
  const departmentLabel = DEPARTMENT_LABELS[department];
  const departmentColor = DEPARTMENT_COLORS[department];

  // Build a map for quick lookup
  const permMap = new Map<string, RolePermissionRow>();
  rolePerms.forEach(p => permMap.set(p.module, p));

  const handleToggle = (module: string, field: 'can_read' | 'can_create' | 'can_update' | 'can_delete', currentValue: boolean) => {
    const existing = permMap.get(module);
    upsertPermission.mutate({
      role: selectedRole,
      module,
      can_read: existing?.can_read ?? false,
      can_create: existing?.can_create ?? false,
      can_update: existing?.can_update ?? false,
      can_delete: existing?.can_delete ?? false,
      notes: existing?.notes,
      [field]: !currentValue,
    });
  };

  const handleAddSpecialPermission = () => {
    if (!newPermission.trim()) return;
    addSpecialPerm.mutate({ role: selectedRole, permission: newPermission.trim() });
    setNewPermission('');
    setShowAddPermission(false);
  };

  // Filter staff not already in this role
  const memberUserIds = new Set(members.map(m => m.user_id));
  const availableStaff = allStaff.filter(
    s => s.user_id && !memberUserIds.has(s.user_id)
  ).filter(s =>
    !staffSearch || `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(staffSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Roles are system-defined and cannot be added or removed from this interface. Use this tab to configure what each role can access and to assign staff members.
        </AlertDescription>
      </Alert>

      {/* Role selector */}
      <div className="flex flex-wrap gap-2">
        {ALL_ROLES.map(role => (
          <Button
            key={role.value}
            variant={selectedRole === role.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedRole(role.value)}
            className="gap-1.5"
          >
            <Shield className="h-3.5 w-3.5" />
            {role.label}
            {(memberCounts[role.value] ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {memberCounts[role.value]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Role header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{roleInfo?.label}</CardTitle>
            <Badge className={departmentColor}>{departmentLabel}</Badge>
          </div>
          <CardDescription>
            Configure module access and special permissions for the {roleInfo?.label} role.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Module Permissions Matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Module Permissions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Module</TableHead>
                  <TableHead className="w-[60px] text-center">Read</TableHead>
                  <TableHead className="w-[60px] text-center">Create</TableHead>
                  <TableHead className="w-[60px] text-center">Update</TableHead>
                  <TableHead className="w-[60px] text-center">Delete</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MODULES.map(module => {
                  const perm = permMap.get(module);
                  return (
                    <TableRow key={module}>
                      <TableCell className="font-medium">{module}</TableCell>
                      {(['can_read', 'can_create', 'can_update', 'can_delete'] as const).map(field => (
                        <TableCell key={field} className="text-center">
                          <Checkbox
                            checked={perm?.[field] ?? false}
                            onCheckedChange={() => handleToggle(module, field, perm?.[field] ?? false)}
                            disabled={upsertPermission.isPending}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-muted-foreground text-sm">
                        {perm?.notes || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Special Permissions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Special Permissions</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowAddPermission(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddPermission && (
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="e.g. Approve settlement offers"
                value={newPermission}
                onChange={e => setNewPermission(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSpecialPermission()}
                autoFocus
              />
              <Button size="sm" onClick={handleAddSpecialPermission} disabled={!newPermission.trim()}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddPermission(false); setNewPermission(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          {roleSpecialPerms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No special permissions defined for this role.</p>
          ) : (
            <div className="space-y-2">
              {roleSpecialPerms.map(sp => (
                <div key={sp.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 group">
                  <span className="text-sm">{sp.permission}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteSpecialPerm.mutate(sp.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </CardTitle>
            <Popover open={staffSearchOpen} onOpenChange={setStaffSearchOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" /> Assign
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="end">
                <Input
                  placeholder="Search staff..."
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  className="mb-2"
                  autoFocus
                />
                <ScrollArea className="max-h-48">
                  {availableStaff.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">No available staff found.</p>
                  ) : (
                    availableStaff.slice(0, 20).map(s => (
                      <button
                        key={s.id}
                        className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-sm"
                        onClick={() => {
                          if (s.user_id) {
                            addMember.mutate({ user_id: s.user_id, role: selectedRole });
                            setStaffSearchOpen(false);
                            setStaffSearch('');
                          }
                        }}
                      >
                        {s.first_name} {s.last_name}
                        <span className="text-muted-foreground ml-1">({s.email})</span>
                      </button>
                    ))
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members assigned to this role.</p>
          ) : (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 group">
                  <div>
                    <span className="text-sm font-medium">
                      {m.staff_first_name} {m.staff_last_name}
                    </span>
                    {m.staff_job_title && (
                      <span className="text-muted-foreground text-sm ml-2">({m.staff_job_title})</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => removeMember.mutate({ id: m.id, role: selectedRole })}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
