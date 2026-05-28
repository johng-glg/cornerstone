import { ReactNode, useEffect, useRef, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { AppSidebar } from './AppSidebar';
import { TopNav } from './TopNav';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import { InactivityTimeoutDialog } from '@/components/auth/InactivityTimeoutDialog';
import { useToast } from '@/hooks/use-toast';
import { ScreenPopProvider } from '@/components/dialpad/ScreenPopProvider';

interface AppLayoutProps {
  children: ReactNode;
}

// Inactivity policy — see phase_2d_summary.md
const IDLE_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_MS = 2 * 60 * 1000; // show warning at T-2 minutes

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, staff, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasUpdatedLogin = useRef(false);

  // Update last_login_at when user loads the app
  useEffect(() => {
    if (user && staff && !hasUpdatedLogin.current) {
      hasUpdatedLogin.current = true;
      supabase
        .from('staff')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to update last login:', error);
          }
        });
    }
  }, [user, staff]);

  const handleTimeout = useCallback(async () => {
    await signOut();
    toast({
      title: 'Signed out',
      description: 'You were signed out due to inactivity.',
    });
    navigate('/auth', { replace: true });
  }, [signOut, toast, navigate]);

  const { warning, remainingMs, reset } = useInactivityTimeout({
    idleMs: IDLE_MS,
    warningMs: WARNING_MS,
    enabled: !!user && !loading,
    onTimeout: handleTimeout,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav />
          <main className="flex-1 p-6 overflow-auto min-w-0">
            {children}
          </main>
        </div>
      </div>
      <InactivityTimeoutDialog
        open={warning}
        remainingMs={remainingMs}
        onStay={reset}
        onSignOut={handleTimeout}
      />
    </SidebarProvider>
  );
}
