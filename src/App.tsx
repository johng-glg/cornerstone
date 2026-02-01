import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import CreditorsPage from "./pages/Creditors";
import PaymentsPage from "./pages/Payments";
import NotFound from "./pages/NotFound";
import CompaniesPage from "./pages/Companies";
import StaffPage from "./pages/Staff";
import SettingsPage from "./pages/Settings";

// Placeholder pages - will be implemented in future phases
const ReportsPage = () => <div className="p-6"><h1 className="text-2xl font-bold">Reports</h1><p className="text-muted-foreground mt-2">Reports coming soon...</p></div>;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes with layout */}
            <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/leads" element={<AppLayout><LeadsPage /></AppLayout>} />
            <Route path="/services" element={<AppLayout><ServicesPage /></AppLayout>} />
            <Route path="/clients" element={<AppLayout><ClientsPage /></AppLayout>} />
            <Route path="/clients/:id" element={<AppLayout><ClientDetailPage /></AppLayout>} />
            <Route path="/liabilities" element={<AppLayout><LiabilitiesPage /></AppLayout>} />
            <Route path="/litigation" element={<AppLayout><LitigationPage /></AppLayout>} />
            <Route path="/tasks" element={<AppLayout><TasksPage /></AppLayout>} />
            <Route path="/creditors" element={<AppLayout><CreditorsPage /></AppLayout>} />
            <Route path="/reports" element={<AppLayout><ReportsPage /></AppLayout>} />
            <Route path="/companies" element={<AppLayout><CompaniesPage /></AppLayout>} />
            <Route path="/staff" element={<AppLayout><StaffPage /></AppLayout>} />
            <Route path="/payments" element={<AppLayout><PaymentsPage /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
