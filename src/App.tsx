import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const queryClient = new QueryClient();

/**
 * Application root. The full route map (clients, leads, liabilities, litigation,
 * services, payments, integrations, settings, etc.) is built out across Phase A
 * PRs A4–A11. This shell establishes the providers and a placeholder landing route
 * so the app boots, builds, and is E2E-smoke-testable from day one.
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function Landing() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background text-foreground">
      <h1 className="text-2xl font-semibold">Cornerstone</h1>
      <p className="text-muted-foreground">Guardian Litigation Group Case Management System</p>
    </main>
  );
}

export default App;
