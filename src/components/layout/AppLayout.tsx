import { type ReactNode, useCallback, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { toast } from "sonner";
import {
  LayoutDashboard,
  UserPlus,
  TrendingUp,
  AlertTriangle,
  ClipboardCheck,
  Briefcase,
  Users,
  DollarSign,
  Scale,
  CalendarDays,
  ReceiptText,
  CheckSquare,
  BarChart3,
  CreditCard,
  Settings as SettingsIcon,
  Lightbulb,
  BookOpen,
  Bell,
  Menu,
  X,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import { useAuth, ROLE_VIEWS } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/Logo";
import { cn } from "@/lib/utils";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { InactivityTimeoutDialog } from "@/components/auth/InactivityTimeoutDialog";
import { useNotifications } from "@/hooks/useDomains";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { GlobalSearch } from "@/components/layout/GlobalSearch";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const MAIN_MENU: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/engagements", label: "Engagements", icon: Briefcase },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/early-warning", label: "Early Warning", icon: AlertTriangle },
  { to: "/liabilities", label: "Liabilities", icon: DollarSign },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
];

const ENROLLMENT: NavItem[] = [
  { to: "/leads", label: "Leads", icon: UserPlus },
  { to: "/lead-metrics", label: "Lead Metrics", icon: TrendingUp },
  { to: "/eligibility-reviews", label: "Eligibility Reviews", icon: ClipboardCheck },
];

const LITIGATION: NavItem[] = [
  { to: "/litigation", label: "Litigation", icon: Scale },
  { to: "/court-calendar", label: "Court Calendar", icon: CalendarDays },
  { to: "/billing", label: "Billing", icon: ReceiptText },
  // Coverages lands here once added.
];

// Setup/config pages live under Settings → Configuration (which links them all), keeping this list
// short. Administration here is just finance/reporting + system.
const ADMINISTRATION: NavItem[] = [
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
  { to: "/feature-requests", label: "Feature Requests", icon: Lightbulb },
  { to: "/docs", label: "Documentation", icon: BookOpen },
];

const IDLE_MS = 30 * 60 * 1000;
const WARNING_MS = 2 * 60 * 1000;

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

function NavSection({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  onNavigate: () => void;
}) {
  return (
    <div className="px-3 py-2">
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {label}
      </p>
      <nav className="space-y-0.5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-white/10 font-medium text-guardian-gold"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const { staff, signOut, isRealAdmin, impersonatedView, setImpersonatedView } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  useRealtimeNotifications();
  const notifications = useNotifications();
  const unread = (notifications.data ?? []).filter((n) => !n.is_read).length;

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

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-guardian-navy transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <NavLink to="/" onClick={closeMobile}>
            <Logo tone="dark" className="h-7 w-auto" />
          </NavLink>
          <button className="text-white/60 lg:hidden" onClick={closeMobile} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <NavSection label="Main Menu" items={MAIN_MENU} onNavigate={closeMobile} />
          <NavSection label="Enrollment" items={ENROLLMENT} onNavigate={closeMobile} />
          <NavSection label="Litigation" items={LITIGATION} onNavigate={closeMobile} />
          <NavSection label="Administration" items={ADMINISTRATION} onNavigate={closeMobile} />
        </div>
        <div className="border-t border-white/10 p-3 text-xs text-white/60">
          <p className="truncate px-1 pb-2">
            {staff ? `${staff.first_name} ${staff.last_name}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="w-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Sign out
          </Button>
        </div>
      </aside>

      {/* Backdrop on mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b bg-background px-4 py-2.5">
          <button
            className="text-muted-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <GlobalSearch />
          <div className="flex flex-1 items-center justify-end gap-3">
            {isRealAdmin && (
              <label
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors",
                  impersonatedView
                    ? "border-guardian-gold/50 bg-guardian-gold/15 text-guardian-navy"
                    : "border-input bg-background text-muted-foreground",
                )}
              >
                <span className="hidden sm:inline">Viewing as</span>
                <select
                  className="bg-transparent text-sm font-medium outline-none"
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
            <NavLink
              to="/notifications"
              className="relative text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-guardian-gold px-1 text-[10px] font-semibold text-guardian-navy">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </NavLink>
            {staff && (
              <span className="hidden text-sm text-muted-foreground sm:inline">{staff.email}</span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <InactivityTimeoutDialog
        open={warning}
        remainingMs={remainingMs}
        onStay={reset}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
