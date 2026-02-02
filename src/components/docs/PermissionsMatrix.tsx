import { Check, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROLE_PERMISSIONS } from '@/lib/docs/rolePermissions';

const modules = [
  'Dashboard',
  'Leads',
  'Clients',
  'Services',
  'Liabilities',
  'Settlements',
  'Litigation',
  'Tasks',
  'Reports',
  'Creditors',
  'Companies',
  'Staff',
  'Payments',
  'Settings',
];

export function PermissionsMatrix() {
  const getAccess = (role: string, module: string) => {
    const roleData = ROLE_PERMISSIONS.find(r => r.role === role);
    const moduleAccess = roleData?.moduleAccess.find(m => m.module === module);
    return moduleAccess;
  };

  const AccessCell = ({ access }: { access: ReturnType<typeof getAccess> }) => {
    if (!access) {
      return <span className="text-muted-foreground">—</span>;
    }

    const permissions = [];
    if (access.read) permissions.push('R');
    if (access.create) permissions.push('C');
    if (access.update) permissions.push('U');
    if (access.delete) permissions.push('D');

    if (permissions.length === 0) {
      return <X className="h-4 w-4 text-muted-foreground" />;
    }

    return (
      <Badge variant={permissions.length === 4 ? "default" : "secondary"} className="text-xs font-mono">
        {permissions.join('')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Permissions Matrix</CardTitle>
          <CardDescription>
            Overview of module access by role. R=Read, C=Create, U=Update, D=Delete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[120px]">Module</TableHead>
                  {ROLE_PERMISSIONS.map(role => (
                    <TableHead key={role.role} className="text-center min-w-[100px]">
                      <div className="text-xs">{role.displayName}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map(module => (
                  <TableRow key={module}>
                    <TableCell className="font-medium sticky left-0 bg-background">{module}</TableCell>
                    {ROLE_PERMISSIONS.map(role => (
                      <TableCell key={role.role} className="text-center">
                        <AccessCell access={getAccess(role.role, module)} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">R</Badge>
              <span className="text-sm">Read - View records</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">C</Badge>
              <span className="text-sm">Create - Add new records</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">U</Badge>
              <span className="text-sm">Update - Edit existing records</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">D</Badge>
              <span className="text-sm">Delete - Remove records</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Special Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Special Permissions by Role</CardTitle>
          <CardDescription>Additional capabilities beyond standard CRUD operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ROLE_PERMISSIONS.map(role => (
              <div key={role.role} className="border-b pb-4 last:border-0">
                <h4 className="font-medium mb-2">{role.displayName}</h4>
                <div className="flex flex-wrap gap-2">
                  {role.specialPermissions.map((perm, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
