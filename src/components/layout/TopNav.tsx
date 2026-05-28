import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_VIEWS } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Search, LogOut, User, Settings, Lightbulb, Eye } from 'lucide-react';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { FeatureRequestDialog } from '@/components/features/FeatureRequestDialog';
export function TopNav() {
  const { user, staff, signOut, isRealAdmin, impersonatedView, setImpersonatedView } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [featureRequestOpen, setFeatureRequestOpen] = useState(false);

  // Global keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = () => {
    if (staff) {
      return `${staff.first_name[0]}${staff.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="h-8 w-8" />
        
        {/* Global Search Trigger */}
        <Button
          variant="outline"
          className="hidden md:flex items-center w-64 justify-start text-muted-foreground hover:text-foreground"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        {/* Global Search Dialog */}
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </div>

      <div className="flex items-center gap-2">
        {/* Feature Request Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFeatureRequestOpen(true)}
          className="hidden sm:flex items-center gap-1.5"
        >
          <Lightbulb className="h-4 w-4" />
          <span className="hidden lg:inline">Request Feature</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setFeatureRequestOpen(true)}
          className="sm:hidden h-9 w-9"
        >
          <Lightbulb className="h-4 w-4" />
        </Button>

        <FeatureRequestDialog open={featureRequestOpen} onOpenChange={setFeatureRequestOpen} />

        {/* Notifications */}
        <NotificationCenter />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={staff?.avatar_url || undefined} alt={staff?.first_name || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {staff ? `${staff.first_name} ${staff.last_name}` : 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
