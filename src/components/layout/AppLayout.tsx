import { type ReactNode, useCallback } from "react";
import { useNavigate, Link, NavLink } from "react-router-dom";
import { toast } from "sonner";
import { useAuth, ROLE_VIEWS } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/Logo";
import { cn } from "@/lib/utils";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { InactivityTimeoutDialog } from "@/components/auth/InactivityTimeoutDialog";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/clients", label: "Clients" },
  { to: "/leads", label: "Leads" },
  { to: "/engagements", label: "Engagements" },
  { to: "/liabilities", label: "Liabilities" },
  { to: "/transactions", label: "Transactions" },
  { to: "/litigation", label: "Litigation" },
  { to: "/templates", label: "Templates" },
  { to: "/signatures", label: "Signatures" },
  { to: "/notifications", label: "Notifications" },
  { to: "/settings", label: "Settings" },
];

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
      <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-guardian-navy px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2.5"
            aria-label="Guardian Litigation Group — Cornerstone"
          >
            <Logo tone="dark" className="h-7 w-auto" />
            <span className="hidden border-l border-white/20 pl-2.5 text-sm font-semibold tracking-wide text-white/80 lg:inline">
              Cornerstone
            </span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm xl:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-2.5 py-1.5 transition-colors",
                    isActive
                      ? "bg-white/10 font-semibold text-guardian-gold"
                      : "text-white/70 hover:bg-white/5 hover:text-white",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {isRealAdmin && (
            <label className="flex items-center gap-2 text-sm text-white/70">
              <span className="hidden sm:inline">View as</span>
              <select
                className="h-9 rounded-md border border-white/20 bg-white/10 px-2 text-sm text-white [&>option]:text-foreground"
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
          {staff && <span className="hidden text-sm text-white/60 sm:inline">{staff.email}</span>}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">{children}</main>

      <InactivityTimeoutDialog
        open={warning}
        remainingMs={remainingMs}
        onStay={reset}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
