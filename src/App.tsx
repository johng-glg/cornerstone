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
import Leads from "@/pages/Leads";
import LeadDetail from "@/pages/LeadDetail";
import Liabilities from "@/pages/Liabilities";
import Engagements from "@/pages/Engagements";
import Transactions from "@/pages/Transactions";
import Litigation from "@/pages/Litigation";
import Templates from "@/pages/Templates";
import Signatures from "@/pages/Signatures";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

/**
 * Application root. Public auth routes are open; everything else is wrapped in AppLayout,
 * which gates on authentication and arms the inactivity timeout. The route map grows as
 * modules land in Phase A (A5+).
 */
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
              <Route
                path="/"
                element={
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                }
              />
              <Route
                path="/clients"
                element={
                  <AppLayout>
                    <Clients />
                  </AppLayout>
                }
              />
              <Route
                path="/leads"
                element={
                  <AppLayout>
                    <Leads />
                  </AppLayout>
                }
              />
              <Route
                path="/leads/:id"
                element={
                  <AppLayout>
                    <LeadDetail />
                  </AppLayout>
                }
              />
              <Route
                path="/liabilities"
                element={
                  <AppLayout>
                    <Liabilities />
                  </AppLayout>
                }
              />
              <Route
                path="/engagements"
                element={
                  <AppLayout>
                    <Engagements />
                  </AppLayout>
                }
              />
              <Route
                path="/transactions"
                element={
                  <AppLayout>
                    <Transactions />
                  </AppLayout>
                }
              />
              <Route
                path="/litigation"
                element={
                  <AppLayout>
                    <Litigation />
                  </AppLayout>
                }
              />
              <Route
                path="/templates"
                element={
                  <AppLayout>
                    <Templates />
                  </AppLayout>
                }
              />
              <Route
                path="/signatures"
                element={
                  <AppLayout>
                    <Signatures />
                  </AppLayout>
                }
              />
              <Route
                path="/notifications"
                element={
                  <AppLayout>
                    <Notifications />
                  </AppLayout>
                }
              />
              <Route
                path="/settings"
                element={
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                }
              />

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
