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
  Lightbulb
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/lib/auth';
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

const mainNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Leads', url: '/leads', icon: UserPlus },
  { title: 'Lead Metrics', url: '/leads/metrics', icon: TrendingUp },
  { title: 'Services', url: '/services', icon: Briefcase },
  { title: 'Clients', url: '/clients', icon: Users },
  { title: 'Liabilities', url: '/liabilities', icon: DollarSign },
  { title: 'Litigation', url: '/litigation', icon: Scale },
  { title: 'Billing', url: '/billing', icon: Clock },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare },
];

const adminNavItems = [
  { title: 'Creditors', url: '/creditors', icon: Landmark },
  { title: 'Opposing Counsel', url: '/opposing-counsel', icon: Gavel },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
  { title: 'Companies', url: '/companies', icon: Building2 },
  { title: 'Staff', url: '/staff', icon: Users },
  { title: 'Payments', url: '/payments', icon: CreditCard },
  { title: 'Settings', url: '/settings', icon: Settings },
  { title: 'Feature Requests', url: '/feature-requests', icon: Lightbulb },
  { title: 'Documentation', url: '/docs', icon: BookOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { hasRole, isAdmin, staff } = useAuth();

  // Filter nav items based on role/department
  const getVisibleItems = () => {
    // All authenticated users see main nav
    return mainNavItems;
  };

  const getAdminItems = () => {
    if (isAdmin()) {
      return adminNavItems;
    }
    // Show Reports and Creditors to attorneys and managers (in legal department)
    if (hasRole('attorney') || hasRole('case_manager')) {
      return adminNavItems.filter(item => 
        item.title === 'Reports' || item.title === 'Creditors'
      );
    }
    // Show Payments to payment processors (in operations department)
    if (hasRole('payment_processor')) {
      return adminNavItems.filter(item => item.title === 'Payments');
    }
    return [];
  };

  const visibleMainItems = getVisibleItems();
  const visibleAdminItems = getAdminItems();

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
                      end={item.url === '/'} 
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
