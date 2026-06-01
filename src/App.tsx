import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Leads from "@/pages/Leads";
import LeadDetail from "@/pages/LeadDetail";
import LeadMetrics from "@/pages/LeadMetrics";
import EligibilityReviews from "@/pages/EligibilityReviews";
import Liabilities from "@/pages/Liabilities";
import Engagements from "@/pages/Engagements";
import Payments from "@/pages/Payments";
import Transactions from "@/pages/Transactions";
import Litigation from "@/pages/Litigation";
import Billing from "@/pages/Billing";
import Tasks from "@/pages/Tasks";
import Creditors from "@/pages/Creditors";
import Reports from "@/pages/Reports";
import Companies from "@/pages/Companies";
import Staff from "@/pages/Staff";
import Integrations from "@/pages/Integrations";
import Templates from "@/pages/Templates";
import Signatures from "@/pages/Signatures";
import Notifications from "@/pages/Notifications";
import FeatureRequests from "@/pages/FeatureRequests";
import Documentation from "@/pages/Documentation";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// Authenticated routes. Each is wrapped in AppLayout (gates auth + renders the shell).
const PROTECTED: Array<{ path: string; element: ReactNode }> = [
  { path: "/", element: <Dashboard /> },
  { path: "/leads", element: <Leads /> },
  { path: "/leads/:id", element: <LeadDetail /> },
  { path: "/lead-metrics", element: <LeadMetrics /> },
  { path: "/eligibility-reviews", element: <EligibilityReviews /> },
  { path: "/engagements", element: <Engagements /> },
  { path: "/clients", element: <Clients /> },
  { path: "/clients/:id", element: <ClientDetail /> },
  { path: "/liabilities", element: <Liabilities /> },
  { path: "/litigation", element: <Litigation /> },
  { path: "/billing", element: <Billing /> },
  { path: "/tasks", element: <Tasks /> },
  { path: "/payments", element: <Payments /> },
  { path: "/transactions", element: <Transactions /> },
  { path: "/creditors", element: <Creditors /> },
  { path: "/reports", element: <Reports /> },
  { path: "/companies", element: <Companies /> },
  { path: "/staff", element: <Staff /> },
  { path: "/integrations", element: <Integrations /> },
  { path: "/templates", element: <Templates /> },
  { path: "/signatures", element: <Signatures /> },
  { path: "/notifications", element: <Notifications /> },
  { path: "/feature-requests", element: <FeatureRequests /> },
  { path: "/documentation", element: <Documentation /> },
  { path: "/settings", element: <Settings /> },
];

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
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
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
