import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import LeadsPage from "./pages/Leads";
import ClientsPage from "./pages/Clients";
import ClientDetailPage from "./pages/ClientDetail";
import ServicesPage from "./pages/Services";
import TasksPage from "./pages/Tasks";
import LiabilitiesPage from "./pages/Liabilities";
import LitigationPage from "./pages/Litigation";
import LitigationTeamsPage from "./pages/LitigationTeams";
import CourtCalendarPage from "./pages/CourtCalendar";
import CreditorsPage from "./pages/Creditors";
import PaymentsPage from "./pages/Payments";
import NotFound from "./pages/NotFound";
import CompaniesPage from "./pages/Companies";
import StaffPage from "./pages/Staff";
import SettingsPage from "./pages/Settings";
import ReportsPage from "./pages/Reports";
import OpposingCounselPage from "./pages/OpposingCounsel";
import LeadMetricsPage from "./pages/LeadMetrics";
import BillingPage from "./pages/Billing";
import { DocsLayout } from "./components/docs/DocsLayout";
import DocsOverview from "./pages/docs/DocsOverview";
import SchemaPage from "./pages/docs/SchemaPage";
import EnumsPage from "./pages/docs/EnumsPage";
import FunctionsPage from "./pages/docs/FunctionsPage";
import EdgeFunctionsPage from "./pages/docs/EdgeFunctionsPage";
import StoragePage from "./pages/docs/StoragePage";
import RoleGuidePage from "./pages/docs/RoleGuidePage";
import FeatureGuidePage from "./pages/docs/FeatureGuidePage";
import RLSPoliciesPage from "./pages/docs/RLSPoliciesPage";
import PermissionsPage from "./pages/docs/PermissionsPage";
import FutureBuildPage from "./pages/docs/FutureBuildPage";
import IntegrationsPage from "./pages/docs/IntegrationsPage";
import SecurityPage from "./pages/docs/SecurityPage";
import ERDPage from "./pages/docs/ERDPage";
import FeatureRequestsPage from "./pages/FeatureRequests";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem
      themes={['light', 'dark', 'system', 'stpatricks', 'july4th', 'halloween']}
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Documentation routes */}
              <Route path="/docs" element={<DocsLayout />}>
                <Route index element={<DocsOverview />} />
                <Route path="schema" element={<SchemaPage />} />
                <Route path="erd" element={<ERDPage />} />
                <Route path="enums" element={<EnumsPage />} />
                <Route path="functions" element={<FunctionsPage />} />
                <Route path="edge-functions" element={<EdgeFunctionsPage />} />
                <Route path="storage" element={<StoragePage />} />
                <Route path="roles/:role" element={<RoleGuidePage />} />
                <Route path="features/:feature" element={<FeatureGuidePage />} />
                <Route path="rls-policies" element={<RLSPoliciesPage />} />
                <Route path="permissions" element={<PermissionsPage />} />
                <Route path="future-builds" element={<FutureBuildPage />} />
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="security-concerns" element={<SecurityPage />} />
              </Route>
              
              {/* Protected routes with layout */}
              <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
              <Route path="/leads" element={<AppLayout><LeadsPage /></AppLayout>} />
              <Route path="/leads/metrics" element={<AppLayout><LeadMetricsPage /></AppLayout>} />
              <Route path="/services" element={<AppLayout><ServicesPage /></AppLayout>} />
              <Route path="/clients" element={<AppLayout><ClientsPage /></AppLayout>} />
              <Route path="/clients/:id" element={<AppLayout><ClientDetailPage /></AppLayout>} />
              <Route path="/liabilities" element={<AppLayout><LiabilitiesPage /></AppLayout>} />
              <Route path="/litigation" element={<AppLayout><LitigationPage /></AppLayout>} />
              <Route path="/litigation/teams" element={<AppLayout><LitigationTeamsPage /></AppLayout>} />
              <Route path="/litigation/calendar" element={<AppLayout><CourtCalendarPage /></AppLayout>} />
              <Route path="/billing" element={<AppLayout><BillingPage /></AppLayout>} />
              <Route path="/tasks" element={<AppLayout><TasksPage /></AppLayout>} />
              <Route path="/creditors" element={<AppLayout><CreditorsPage /></AppLayout>} />
              <Route path="/reports" element={<AppLayout><ReportsPage /></AppLayout>} />
              <Route path="/companies" element={<AppLayout><CompaniesPage /></AppLayout>} />
              <Route path="/staff" element={<AppLayout><StaffPage /></AppLayout>} />
              <Route path="/payments" element={<AppLayout><PaymentsPage /></AppLayout>} />
              <Route path="/opposing-counsel" element={<AppLayout><OpposingCounselPage /></AppLayout>} />
              <Route path="/feature-requests" element={<AppLayout><FeatureRequestsPage /></AppLayout>} />
              <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
