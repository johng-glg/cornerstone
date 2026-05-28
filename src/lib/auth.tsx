import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface StaffProfile {
  id: string;
  user_id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department: string;
  job_title: string | null;
  is_active: boolean;
  avatar_url: string | null;
}

interface UserRole {
  role: string;
}

export interface RoleView {
  key: string;
  label: string;
  roles: string[];
  department: string;
}

export const ROLE_VIEWS: RoleView[] = [
  { key: 'admin', label: 'Admin', roles: ['admin'], department: 'administration' },
  { key: 'attorney', label: 'Attorney', roles: ['attorney'], department: 'legal' },
  { key: 'case_manager', label: 'Case Manager', roles: ['case_manager'], department: 'legal' },
  { key: 'paralegal', label: 'Paralegal / Legal Staff', roles: ['paralegal'], department: 'legal' },
  { key: 'sales_rep', label: 'Sales Rep', roles: ['sales_rep'], department: 'sales' },
  { key: 'negotiator', label: 'Negotiator', roles: ['negotiator'], department: 'negotiations' },
  { key: 'payment_processor', label: 'Payment Processor', roles: ['payment_processor'], department: 'operations' },
  { key: 'correspondent', label: 'Correspondence', roles: ['correspondent'], department: 'operations' },
  { key: 'client_services_rep', label: 'Client Services Rep', roles: ['client_services_rep'], department: 'client_services' },
  { key: 'eligibility_reviewer', label: 'Eligibility Reviewer', roles: ['eligibility_reviewer'], department: 'eligibility' },
  { key: 'viewer', label: 'Viewer', roles: ['viewer'], department: 'administration' },
];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  staff: StaffProfile | null;
  roles: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
  // Role impersonation (admin only, view-only)
  impersonatedView: string | null;
  setImpersonatedView: (key: string | null) => void;
  realRoles: string[];
  isRealAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IMPERSONATION_KEY = 'lovable.impersonatedRoleView';
export const PASSWORD_RECOVERY_STORAGE_KEY = 'lovable.passwordRecoveryActive';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, 'true');
        }
        if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer fetching additional data to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setStaff(null);
          setRoles([]);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
        fetchUserRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      setStaff(data as StaffProfile);
    }
  };

  const fetchUserRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (!error && data) {
      setRoles((data as UserRole[]).map(r => r.role));
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setStaff(null);
    setRoles([]);
  };

  const requestPasswordReset = async (email: string) => {
    sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const realRoles = roles;
  const isRealAdmin = realRoles.includes('admin');

  const [impersonatedView, setImpersonatedViewState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(IMPERSONATION_KEY);
  });

  const setImpersonatedView = (key: string | null) => {
    if (key) sessionStorage.setItem(IMPERSONATION_KEY, key);
    else sessionStorage.removeItem(IMPERSONATION_KEY);
    setImpersonatedViewState(key);
  };

  // Only honor impersonation if the real user is an admin
  const activeView = isRealAdmin
    ? ROLE_VIEWS.find((v) => v.key === impersonatedView) ?? null
    : null;

  const effectiveRoles = activeView ? activeView.roles : roles;
  const effectiveStaff = activeView && staff
    ? { ...staff, department: activeView.department }
    : staff;

  const hasRole = (role: string) => effectiveRoles.includes(role);
  const isAdmin = () => hasRole('admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        staff: effectiveStaff,
        roles: effectiveRoles,
        loading,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        updatePassword,
        hasRole,
        isAdmin,
        impersonatedView: activeView?.key ?? null,
        setImpersonatedView,
        realRoles,
        isRealAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
