import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Mail, Phone, Building2, Plus, Clock, List, LayoutGrid, ChevronDown, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StaffFormDialog } from '@/components/staff/StaffFormDialog';
import { SortableHeader, SortDirection } from '@/components/ui/sortable-header';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { DEPARTMENT_ORDER, DEPARTMENT_LABELS, DEPARTMENT_COLORS, type Department } from '@/lib/staffDepartments';

type SortKey = 'name' | 'department' | 'email' | 'company' | 'last_login_at' | 'is_active';

interface StaffMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department: Department;
  company_id: string;
  is_active: boolean;
  avatar_url: string | null;
  job_title: string | null;
  last_login_at: string | null;
  company: { name: string } | null;
}

function formatLastLogin(dateString: string | null): string {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  
  if (isToday(date)) {
    return `Today, ${format(date, 'h:mm a')}`;
  }
  
  if (isYesterday(date)) {
    return `Yesterday, ${format(date, 'h:mm a')}`;
  }
  
  const daysDiff = differenceInDays(now, date);
  if (daysDiff <= 7) {
    return `${daysDiff} days ago`;
  }
  
  return format(date, 'MMM d, yyyy');
}

export default function StaffPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(DEPARTMENT_ORDER));
  const [sortKey, setSortKey] = useState<SortKey>('last_login_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          company:companies(name)
        `)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as StaffMember[];
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ['user-roles-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  const handleSort = useCallback((key: string) => {
    const newKey = key as SortKey;
    if (sortKey === newKey) {
      // Toggle direction or clear
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    } else {
      setSortKey(newKey);
      setSortDirection('desc');
    }
  }, [sortKey, sortDirection]);

  const sortedStaff = useMemo(() => {
    if (!staff || !sortKey) return staff || [];
    
    return [...staff].sort((a, b) => {
      let aVal: string | number | boolean | null;
      let bVal: string | number | boolean | null;
      
      switch (sortKey) {
        case 'name':
          aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
          bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'department':
          aVal = a.department;
          bVal = b.department;
          break;
        case 'email':
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case 'company':
          aVal = a.company?.name?.toLowerCase() || '';
          bVal = b.company?.name?.toLowerCase() || '';
          break;
        case 'last_login_at':
          // Null values go to end
          aVal = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
          bVal = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
          break;
        case 'is_active':
          aVal = a.is_active ? 1 : 0;
          bVal = b.is_active ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (aVal === bVal) return 0;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [staff, sortKey, sortDirection]);

  const staffByDepartment = useMemo(() => {
    if (!sortedStaff) return new Map<string, StaffMember[]>();
    
    const grouped = new Map<string, StaffMember[]>();
    for (const member of sortedStaff) {
      const existing = grouped.get(member.department) || [];
      grouped.set(member.department, [...existing, member]);
    }
    
    // Sort by department order
    return new Map(
      DEPARTMENT_ORDER
        .filter(dept => grouped.has(dept))
        .map(dept => [dept, grouped.get(dept)!])
    );
  }, [sortedStaff]);

  const getRolesForUser = (userId: string) => {
    return userRoles?.filter(r => r.user_id === userId).map(r => r.role) || [];
  };

  const getDepartmentBadge = (department: string) => {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${DEPARTMENT_COLORS[department] || 'bg-gray-100 text-gray-800'}`}>
        {department.replace('_', ' ')}
      </span>
    );
  };

  const handleRowClick = (member: StaffMember) => {
    setSelectedStaff(member);
    setShowDialog(true);
  };

  const handleAddNew = () => {
    setSelectedStaff(null);
    setShowDialog(true);
  };

  const handleDialogClose = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      setSelectedStaff(null);
    }
  };

  const toggleDepartment = (dept: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(dept)) {
        next.delete(dept);
      } else {
        next.add(dept);
      }
      return next;
    });
  };

  const renderStaffRow = (member: StaffMember, showDepartment: boolean = true) => (
    <TableRow 
      key={member.id}
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handleRowClick(member)}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={member.avatar_url || undefined} />
            <AvatarFallback>
              {member.first_name[0]}{member.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {member.first_name} {member.last_name}
            </p>
            {member.job_title && (
              <p className="text-sm text-muted-foreground">
                {member.job_title}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      {showDepartment && (
        <TableCell>
          {getDepartmentBadge(member.department)}
        </TableCell>
      )}
      <TableCell>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{member.email}</span>
          </div>
          {member.phone && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{member.phone}</span>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{member.company?.name || 'N/A'}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {getRolesForUser(member.user_id).map((role) => (
            <Badge key={role} variant="outline" className="text-xs capitalize">
              {role}
            </Badge>
          ))}
          {getRolesForUser(member.user_id).length === 0 && (
            <span className="text-xs text-muted-foreground">No roles</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatLastLogin(member.last_login_at)}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={member.is_active ? 'default' : 'secondary'}>
          {member.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
    </TableRow>
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">
            {staff?.length || 0} staff members
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => value && setViewMode(value as 'list' | 'grouped')}
          >
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grouped" aria-label="Grouped view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
        </div>
      </div>

      <StaffFormDialog 
        open={showDialog} 
        onOpenChange={handleDialogClose}
        staffMember={selectedStaff}
      />

      {viewMode === 'list' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader
                    label="Staff Member"
                    sortKey="name"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Department"
                    sortKey="department"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Contact"
                    sortKey="email"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Company"
                    sortKey="company"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHead>Roles</TableHead>
                  <SortableHeader
                    label="Last Login"
                    sortKey="last_login_at"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Status"
                    sortKey="is_active"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStaff?.map((member) => renderStaffRow(member, true))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(staffByDepartment.entries()).map(([dept, members]) => (
            <Collapsible
              key={dept}
              open={expandedDepts.has(dept)}
              onOpenChange={() => toggleDepartment(dept)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {expandedDepts.has(dept) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${DEPARTMENT_COLORS[dept] || 'bg-gray-100 text-gray-800'}`}>
                        {DEPARTMENT_LABELS[dept] || dept}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {members.length} {members.length === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-0 pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff Member</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Roles</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => renderStaffRow(member, false))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {(!staff || staff.length === 0) && (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No staff members found</h3>
          <p className="text-muted-foreground">No staff members have been added yet.</p>
        </Card>
      )}
    </div>
  );
}
