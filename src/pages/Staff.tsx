import { useState, useMemo } from 'react';
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
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';

interface StaffMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department: string;
  company_id: string;
  is_active: boolean;
  avatar_url: string | null;
  job_title: string | null;
  last_login_at: string | null;
  company: { name: string } | null;
}

const DEPARTMENT_ORDER = [
  'admin',
  'sales_intake',
  'client_services',
  'attorney',
  'case_manager',
  'negotiations',
  'payment_processing',
  'correspondence',
];

const DEPARTMENT_LABELS: Record<string, string> = {
  admin: 'Admin',
  sales_intake: 'Sales & Intake',
  client_services: 'Client Services',
  attorney: 'Attorney',
  case_manager: 'Case Manager',
  negotiations: 'Negotiations',
  payment_processing: 'Payment Processing',
  correspondence: 'Correspondence',
};

const DEPARTMENT_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  attorney: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  negotiations: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  case_manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  sales_intake: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  client_services: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  payment_processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  correspondence: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
};

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

  const staffByDepartment = useMemo(() => {
    if (!staff) return new Map<string, StaffMember[]>();
    
    const grouped = new Map<string, StaffMember[]>();
    for (const member of staff) {
      const existing = grouped.get(member.department) || [];
      grouped.set(member.department, [...existing, member]);
    }
    
    // Sort by department order
    return new Map(
      DEPARTMENT_ORDER
        .filter(dept => grouped.has(dept))
        .map(dept => [dept, grouped.get(dept)!])
    );
  }, [staff]);

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
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff?.map((member) => renderStaffRow(member, true))}
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
