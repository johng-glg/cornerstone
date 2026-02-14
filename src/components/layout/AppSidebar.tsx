import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  Briefcase, 
  DollarSign, 
  CheckSquare,
  BarChart3,
  Building2,
  Settings,
  CreditCard,
  Scale,
  Landmark,
  BookOpen,
  Gavel,
  TrendingUp,
  Clock,
  Lightbulb,
  ShieldCheck,
  ClipboardCheck
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/lib/auth';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

/** Map sidebar items to their permission module name */
interface NavItem {
  title: string;
  url: string;
  icon: any;
  module: string; // maps to role_permissions.module
  end?: boolean;  // exact match for NavLink
}

const allNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, module: 'Dashboard', end: true },
  { title: 'Leads', url: '/leads', icon: UserPlus, module: 'Leads' },
  { title: 'Lead Metrics', url: '/leads/metrics', icon: TrendingUp, module: 'Leads' },
  { title: 'Eligibility Reviews', url: '/eligibility-reviews', icon: ClipboardCheck, module: 'Eligibility Reviews' },
  { title: 'Services', url: '/services', icon: Briefcase, module: 'Services' },
  { title: 'Clients', url: '/clients', icon: Users, module: 'Clients' },
  { title: 'Liabilities', url: '/liabilities', icon: DollarSign, module: 'Liabilities' },
  { title: 'Litigation', url: '/litigation', icon: Scale, module: 'Litigation' },
  { title: 'Billing', url: '/billing', icon: Clock, module: 'Billing' },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare, module: 'Tasks' },
];

const adminNavItems: NavItem[] = [
  { title: 'Creditors', url: '/creditors', icon: Landmark, module: 'Creditors' },
  { title: 'Reports', url: '/reports', icon: BarChart3, module: 'Reports' },
  { title: 'Companies', url: '/companies', icon: Building2, module: 'Companies' },
  { title: 'Staff', url: '/staff', icon: Users, module: 'Staff' },
  { title: 'Payments', url: '/payments', icon: CreditCard, module: 'Payments' },
  { title: 'Settings', url: '/settings', icon: Settings, module: 'Settings' },
  { title: 'Feature Requests', url: '/feature-requests', icon: Lightbulb, module: 'Settings' },
  { title: 'Documentation', url: '/docs', icon: BookOpen, module: 'Settings' },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { isAdmin, staff } = useAuth();
  const { data: permissions = [] } = useMyPermissions();

  const canRead = (module: string) => {
    if (isAdmin()) return true;
    const perm = permissions.find(p => p.module === module);
    return perm?.can_read ?? false;
  };

  const visibleMainItems = allNavItems.filter(item => canRead(item.module));
  const visibleAdminItems = isAdmin()
    ? adminNavItems
    : adminNavItems.filter(item => canRead(item.module));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={`flex items-center py-4 ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}>
          <div className="bg-sidebar-primary p-2 rounded-lg flex-shrink-0">
            <Scale className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-heading font-bold text-sidebar-foreground text-sm">
                GUARDIAN
              </span>
              <span className="text-xs text-sidebar-foreground/70">
                Litigation Group
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      end={item.end} 
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink 
                        to={item.url} 
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && staff && (
          <div className="px-4 py-3">
            <p className="text-xs text-sidebar-foreground/60">Logged in as</p>
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {staff.first_name} {staff.last_name}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {staff.department.replace('_', ' ')}
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
