import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Placeholder pages - will be implemented
const LeadsPage = () => <div className="p-6"><h1 className="text-2xl font-bold">Leads</h1><p className="text-muted-foreground mt-2">Lead management coming soon...</p></div>;
const EngagementsPage = () => <div className="p-6"><h1 className="text-2xl font-bold">Engagements</h1><p className="text-muted-foreground mt-2">Engagement management coming soon...</p></div>;
const ContactsPage = () => <div className="p-6"><h1 className="text-2xl font-bold">Contacts</h1><p className="text-muted-foreground mt-2">Contact management coming soon...</p></div>;
const LiabilitiesPage = () => <div className="p-6"><h1 className="text-2xl font-bold">Liabilities</h1><p className="text-muted-foreground mt-2">Liability management coming soon...</p></div>;
const TasksPage = () => <div className="p-6"><h1 className="text-2xl font-bold">Tasks</h1><p className="text-muted-foreground mt-2">Task management coming soon...</p></div>;
const ReportsPage = () => <div className="p-6"><h1 className="text-2xl font-bold">Reports</h1><p className="text-muted-foreground mt-2">Reports coming soon...</p></div>;
const CompaniesPage = () => <div className="p-6"><h1 className="text-2xl font-bold">Companies</h1><p className="text-muted-foreground mt-2">Company management coming soon...</p></div>;
const PaymentsPage = () => <div className="p-6"><h1 className="text-2xl font-bold">Payments</h1><p className="text-muted-foreground mt-2">Payment processing coming soon...</p></div>;
const SettingsPage = () => <div className="p-6"><h1 className="text-2xl font-bold">Settings</h1><p className="text-muted-foreground mt-2">Settings coming soon...</p></div>;

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
            <Route path="/engagements" element={<AppLayout><EngagementsPage /></AppLayout>} />
            <Route path="/contacts" element={<AppLayout><ContactsPage /></AppLayout>} />
            <Route path="/liabilities" element={<AppLayout><LiabilitiesPage /></AppLayout>} />
            <Route path="/tasks" element={<AppLayout><TasksPage /></AppLayout>} />
            <Route path="/reports" element={<AppLayout><ReportsPage /></AppLayout>} />
            <Route path="/companies" element={<AppLayout><CompaniesPage /></AppLayout>} />
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
