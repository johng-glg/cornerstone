import { ReactNode, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { AppSidebar } from './AppSidebar';
import { TopNav } from './TopNav';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, staff } = useAuth();
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
    </SidebarProvider>
  );
}
