import { type ReactNode, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth, ROLE_VIEWS } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { InactivityTimeoutDialog } from "@/components/auth/InactivityTimeoutDialog";

const IDLE_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_MS = 2 * 60 * 1000; // warn at T-2 minutes

/**
 * Authenticated application shell: gates via ProtectedRoute, renders the top bar (brand,
 * admin role-impersonation lens, user identity, sign-out), arms the inactivity timeout, and
 * renders the routed page. The full sidebar navigation is added as modules land (A5+).
 */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const { staff, signOut, isRealAdmin, impersonatedView, setImpersonatedView } = useAuth();
  const navigate = useNavigate();

  const handleTimeout = useCallback(() => {
    void signOut().then(() => {
      toast("Signed out", { description: "You were signed out due to inactivity." });
      navigate("/auth", { replace: true });
    });
  }, [signOut, navigate]);

  const { warning, remainingMs, reset } = useInactivityTimeout({
    idleMs: IDLE_MS,
    warningMs: WARNING_MS,
    enabled: true,
    onTimeout: handleTimeout,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Link to="/" className="font-semibold">
          Cornerstone
        </Link>
        <div className="flex items-center gap-3">
          {isRealAdmin && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">View as</span>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={impersonatedView ?? ""}
                onChange={(e) => setImpersonatedView(e.target.value || null)}
                aria-label="Impersonate role view"
              >
                <option value="">Admin (real)</option>
                {ROLE_VIEWS.filter((v) => v.key !== "admin").map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {staff && (
            <span className="hidden text-sm text-muted-foreground sm:inline">{staff.email}</span>
          )}
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4">{children}</main>

      <InactivityTimeoutDialog
        open={warning}
        remainingMs={remainingMs}
        onStay={reset}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
