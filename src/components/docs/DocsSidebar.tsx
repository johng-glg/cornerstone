import { NavLink, useLocation } from 'react-router-dom';
import { 
  Database, 
  Users, 
  BookOpen, 
  Code, 
  Shield, 
  FileText,
  Settings,
  ChevronRight,
  Home,
  Rocket,
  Plug,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ROLE_PERMISSIONS } from '@/lib/docs/rolePermissions';
import { FEATURE_GUIDES } from '@/lib/docs/featureGuides';

interface DocsSidebarProps {
  className?: string;
}

export function DocsSidebar({ className }: DocsSidebarProps) {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const linkClass = (path: string) => cn(
    "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
    isActive(path) 
      ? "bg-primary text-primary-foreground font-medium" 
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );

  const sectionClass = "mb-6";
  const sectionTitleClass = "flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider";

  return (
    <div className={cn("w-64 border-r bg-card", className)}>
      <div className="p-4 border-b">
        <NavLink to="/docs" className="flex items-center gap-2 font-semibold text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          Documentation
        </NavLink>
      </div>
      
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-4">
          {/* Overview */}
          <div className={sectionClass}>
            <NavLink to="/docs" className={linkClass('/docs')}>
              <Home className="h-4 w-4" />
              Overview
            </NavLink>
          </div>

          {/* Technical Reference */}
          <div className={sectionClass}>
            <div className={sectionTitleClass}>
              <Database className="h-4 w-4" />
              Technical Reference
            </div>
            <nav className="space-y-1 mt-2">
              <NavLink to="/docs/schema" className={linkClass('/docs/schema')}>
                <ChevronRight className="h-3 w-3" />
                Database Schema
              </NavLink>
              <NavLink to="/docs/enums" className={linkClass('/docs/enums')}>
                <ChevronRight className="h-3 w-3" />
                Enums & Types
              </NavLink>
              <NavLink to="/docs/functions" className={linkClass('/docs/functions')}>
                <ChevronRight className="h-3 w-3" />
                Database Functions
              </NavLink>
              <NavLink to="/docs/edge-functions" className={linkClass('/docs/edge-functions')}>
                <ChevronRight className="h-3 w-3" />
                Edge Functions
              </NavLink>
              <NavLink to="/docs/storage" className={linkClass('/docs/storage')}>
                <ChevronRight className="h-3 w-3" />
                Storage Buckets
              </NavLink>
            </nav>
          </div>

          {/* Role Guides */}
          <div className={sectionClass}>
            <div className={sectionTitleClass}>
              <Users className="h-4 w-4" />
              Role Guides
            </div>
            <nav className="space-y-1 mt-2">
              {ROLE_PERMISSIONS.map(role => (
                <NavLink 
                  key={role.role} 
                  to={`/docs/roles/${role.role}`} 
                  className={linkClass(`/docs/roles/${role.role}`)}
                >
                  <ChevronRight className="h-3 w-3" />
                  {role.displayName}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Feature Guides */}
          <div className={sectionClass}>
            <div className={sectionTitleClass}>
              <FileText className="h-4 w-4" />
              Feature Guides
            </div>
            <nav className="space-y-1 mt-2">
              {FEATURE_GUIDES.map(guide => (
                <NavLink 
                  key={guide.id} 
                  to={`/docs/features/${guide.id}`} 
                  className={linkClass(`/docs/features/${guide.id}`)}
                >
                  <ChevronRight className="h-3 w-3" />
                  {guide.title}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Security */}
          <div className={sectionClass}>
            <div className={sectionTitleClass}>
              <Shield className="h-4 w-4" />
              Security
            </div>
            <nav className="space-y-1 mt-2">
              <NavLink to="/docs/rls-policies" className={linkClass('/docs/rls-policies')}>
                <ChevronRight className="h-3 w-3" />
                RLS Policies
              </NavLink>
              <NavLink to="/docs/permissions" className={linkClass('/docs/permissions')}>
                <ChevronRight className="h-3 w-3" />
                Permissions Matrix
              </NavLink>
            </nav>
          </div>

          {/* Roadmap */}
          <div className={sectionClass}>
            <div className={sectionTitleClass}>
              <Rocket className="h-4 w-4" />
              Roadmap
            </div>
            <nav className="space-y-1 mt-2">
              <NavLink to="/docs/future-builds" className={linkClass('/docs/future-builds')}>
                <ChevronRight className="h-3 w-3" />
                Future Builds
              </NavLink>
              <NavLink to="/docs/integrations" className={linkClass('/docs/integrations')}>
                <Plug className="h-3 w-3" />
                Integrations
              </NavLink>
              <NavLink to="/docs/security-concerns" className={linkClass('/docs/security-concerns')}>
                <AlertTriangle className="h-3 w-3" />
                Security Concerns
              </NavLink>
            </nav>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
