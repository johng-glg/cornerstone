import { type ReactNode, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";

// Lazy-loaded pages — each becomes its own chunk so the initial bundle stays small and
// heavy deps (charts, the enrollment wizard) only load when their route is visited.
const Auth = lazy(() => import("@/pages/Auth"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Clients = lazy(() => import("@/pages/Clients"));
const ClientDetail = lazy(() => import("@/pages/ClientDetail"));
const Leads = lazy(() => import("@/pages/Leads"));
const LeadDetail = lazy(() => import("@/pages/LeadDetail"));
const LeadMetrics = lazy(() => import("@/pages/LeadMetrics"));
const EligibilityReviews = lazy(() => import("@/pages/EligibilityReviews"));
const Liabilities = lazy(() => import("@/pages/Liabilities"));
const LiabilityDetail = lazy(() => import("@/pages/LiabilityDetail"));
const Engagements = lazy(() => import("@/pages/Engagements"));
const EngagementDetail = lazy(() => import("@/pages/EngagementDetail"));
const Payments = lazy(() => import("@/pages/Payments"));
const Transactions = lazy(() => import("@/pages/Transactions"));
const Litigation = lazy(() => import("@/pages/Litigation"));
const LitigationDetail = lazy(() => import("@/pages/LitigationDetail"));
const CourtCalendar = lazy(() => import("@/pages/CourtCalendar"));
const LitigationTeams = lazy(() => import("@/pages/LitigationTeams"));
const LeadRules = lazy(() => import("@/pages/LeadRules"));
const Billing = lazy(() => import("@/pages/Billing"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const Creditors = lazy(() => import("@/pages/Creditors"));
const Reports = lazy(() => import("@/pages/Reports"));
const ReconciliationDashboard = lazy(() => import("@/pages/ReconciliationDashboard"));
const Services = lazy(() => import("@/pages/Services"));
const Companies = lazy(() => import("@/pages/Companies"));
const Staff = lazy(() => import("@/pages/Staff"));
const Integrations = lazy(() => import("@/pages/Integrations"));
const Templates = lazy(() => import("@/pages/Templates"));
const Signatures = lazy(() => import("@/pages/Signatures"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const FeatureRequests = lazy(() => import("@/pages/FeatureRequests"));
const DocsPortal = lazy(() => import("@/pages/docs"));
const Settings = lazy(() => import("@/pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const PROTECTED: Array<{ path: string; element: ReactNode }> = [
  { path: "/", element: <Dashboard /> },
  { path: "/leads", element: <Leads /> },
  { path: "/leads/:id", element: <LeadDetail /> },
  { path: "/lead-metrics", element: <LeadMetrics /> },
  { path: "/eligibility-reviews", element: <EligibilityReviews /> },
  { path: "/engagements", element: <Engagements /> },
  { path: "/engagements/:id", element: <EngagementDetail /> },
  { path: "/clients", element: <Clients /> },
  { path: "/clients/:id", element: <ClientDetail /> },
  { path: "/liabilities", element: <Liabilities /> },
  { path: "/liabilities/:id", element: <LiabilityDetail /> },
  { path: "/litigation", element: <Litigation /> },
  { path: "/litigation/:id", element: <LitigationDetail /> },
  { path: "/court-calendar", element: <CourtCalendar /> },
  { path: "/litigation-teams", element: <LitigationTeams /> },
  { path: "/lead-rules", element: <LeadRules /> },
  { path: "/billing", element: <Billing /> },
  { path: "/tasks", element: <Tasks /> },
  { path: "/payments", element: <Payments /> },
  { path: "/transactions", element: <Transactions /> },
  { path: "/creditors", element: <Creditors /> },
  { path: "/reports", element: <Reports /> },
  { path: "/reports/reconciliation", element: <ReconciliationDashboard /> },
  { path: "/services", element: <Services /> },
  { path: "/companies", element: <Companies /> },
  { path: "/staff", element: <Staff /> },
  { path: "/integrations", element: <Integrations /> },
  { path: "/templates", element: <Templates /> },
  { path: "/signatures", element: <Signatures /> },
  { path: "/notifications", element: <Notifications /> },
  { path: "/feature-requests", element: <FeatureRequests /> },
  { path: "/docs/*", element: <DocsPortal /> },
  { path: "/documentation", element: <Navigate to="/docs" replace /> },
  { path: "/settings", element: <Settings /> },
];

function PageFallback() {
  return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        forcedTheme="light"
      >
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Public */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Protected */}
                {PROTECTED.map(({ path, element }) => (
                  <Route key={path} path={path} element={<AppLayout>{element}</AppLayout>} />
                ))}

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
