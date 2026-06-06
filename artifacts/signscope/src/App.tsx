import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import LandingPage from "@/pages/LandingPage";
import AppShell from "@/pages/AppShell";
import Overview from "@/pages/Overview";
import IntentLab from "@/pages/IntentLab";
import InvoiceAttackLab from "@/pages/InvoiceAttackLab";
import TransactionDiff from "@/pages/TransactionDiff";
import LedgerGate from "@/pages/LedgerGate";
import AuditLogs from "@/pages/AuditLogs";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      
      <Route path="/app*">
        <AppShell>
          <Switch>
            <Route path="/app" component={Overview} />
            <Route path="/app/intent" component={IntentLab} />
            <Route path="/app/invoice" component={InvoiceAttackLab} />
            <Route path="/app/diff" component={TransactionDiff} />
            <Route path="/app/ledger" component={LedgerGate} />
            <Route path="/app/audit" component={AuditLogs} />
            <Route path="/app/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </AppShell>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
