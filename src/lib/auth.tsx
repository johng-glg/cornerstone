import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PASSWORD_RECOVERY_STORAGE_KEY } from "@/lib/authRecovery";
import {
  TEST_AUTH_ENABLED,
  buildTestAuthState,
  clearTestAuthMarker,
  readTestAuthMarker,
} from "@/lib/testAuth";

/** Staff profile row (mirrors public.staff). Typed locally until generated DB types land. */
export interface StaffProfile {
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

/** A preset, view-only role lens an admin can impersonate from the top bar. */
export interface RoleView {
  key: string;
  label: string;
  roles: string[];
  department: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ROLE_VIEWS: RoleView[] = [
  { key: "admin", label: "Admin", roles: ["admin"], department: "admin" },
  { key: "attorney", label: "Attorney", roles: ["attorney"], department: "attorney" },
  {
    key: "case_manager",
    label: "Case Manager",
    roles: ["case_manager"],
    department: "case_manager",
  },
  {
    key: "paralegal",
    label: "Paralegal / Legal Staff",
    roles: ["paralegal"],
    department: "attorney",
  },
  { key: "sales_rep", label: "Sales Rep", roles: ["sales_rep"], department: "sales_intake" },
  { key: "negotiator", label: "Negotiator", roles: ["negotiator"], department: "negotiations" },
  {
    key: "payment_processor",
    label: "Payment Processor",
    roles: ["payment_processor"],
    department: "payment_processing",
  },
  {
    key: "correspondent",
    label: "Correspondence",
    roles: ["correspondent"],
    department: "correspondence",
  },
  {
    key: "client_services_rep",
    label: "Client Services Rep",
    roles: ["client_services_rep"],
    department: "client_services",
  },
  { key: "viewer", label: "Viewer", roles: ["viewer"], department: "admin" },
];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  staff: StaffProfile | null;
  roles: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
  // Role impersonation (admin only, view-only; never affects database RLS).
  impersonatedView: string | null;
  setImpersonatedView: (key: string | null) => void;
  realRoles: string[];
  isRealAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IMPERSONATION_KEY = "cornerstone.impersonatedRoleView";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && data) {
      setStaff(data as StaffProfile);
    }
  }, []);

  const fetchUserRoles = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!error && data) {
      setRoles((data as { role: string }[]).map((r) => r.role));
    }
  }, []);

  useEffect(() => {
    // Dev/test-only seam: if the synthetic-session marker is present (Playwright set it),
    // hydrate a fake authenticated session and skip Supabase entirely. Compiled out of
    // production builds — TEST_AUTH_ENABLED is a literal `false` unless VITE_E2E_TEST_AUTH=1.
    if (TEST_AUTH_ENABLED) {
      const marker = readTestAuthMarker();
      if (marker) {
        const t = buildTestAuthState(marker);
        setSession(t.session);
        setUser(t.user);
        setStaff(t.staff);
        setRoles(t.roles);
        setLoading(false);
        return;
      }
    }

    // Register the auth-state listener BEFORE checking the existing session so no event is missed.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (
        event === "PASSWORD_RECOVERY" ||
        (nextSession && window.location.pathname === "/reset-password")
      ) {
        sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, "true");
      }
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      // Defer Supabase calls out of the callback to avoid a client deadlock.
      if (nextSession?.user) {
        const uid = nextSession.user.id;
        setTimeout(() => {
          void fetchUserProfile(uid);
          void fetchUserRoles(uid);
        }, 0);
      } else {
        setStaff(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        void fetchUserProfile(existing.user.id);
        void fetchUserRoles(existing.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, fetchUserRoles]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { first_name: firstName, last_name: lastName },
      },
    });
    return { error };
  };

  const signOut = async () => {
    if (TEST_AUTH_ENABLED) clearTestAuthMarker();
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
  const isRealAdmin = realRoles.includes("admin");

  const [impersonatedView, setImpersonatedViewState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(IMPERSONATION_KEY);
  });

  const setImpersonatedView = (key: string | null) => {
    if (key) sessionStorage.setItem(IMPERSONATION_KEY, key);
    else sessionStorage.removeItem(IMPERSONATION_KEY);
    setImpersonatedViewState(key);
  };

  // Impersonation is honoured only for real admins, and only changes the UI lens —
  // database RLS always enforces the real user's permissions.
  const activeView = isRealAdmin
    ? (ROLE_VIEWS.find((v) => v.key === impersonatedView) ?? null)
    : null;

  const effectiveRoles = activeView ? activeView.roles : roles;
  const effectiveStaff =
    activeView && staff ? { ...staff, department: activeView.department } : staff;

  const hasRole = (role: string) => effectiveRoles.includes(role);
  const isAdmin = () => hasRole("admin");

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        staff: effectiveStaff,
        roles: effectiveRoles,
        loading,
        signIn,
        signInWithGoogle,
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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
