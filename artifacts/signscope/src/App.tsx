import { Switch, Route } from "wouter";
import type { ReactNode } from "react";
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
import WalletCli from "@/pages/WalletCli";
import AuditLogs from "@/pages/AuditLogs";
import Settings from "@/pages/Settings";
import SpeculosDmk from "@/pages/SpeculosDmk";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function AppRoute({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/app/intent"><AppRoute><IntentLab /></AppRoute></Route>
      <Route path="/app/invoice"><AppRoute><InvoiceAttackLab /></AppRoute></Route>
      <Route path="/app/diff"><AppRoute><TransactionDiff /></AppRoute></Route>
      <Route path="/app/ledger"><AppRoute><LedgerGate /></AppRoute></Route>
      <Route path="/app/wallet-cli"><AppRoute><WalletCli /></AppRoute></Route>
      <Route path="/app/audit"><AppRoute><AuditLogs /></AppRoute></Route>
      <Route path="/app/settings"><AppRoute><Settings /></AppRoute></Route>
      <Route path="/app/dmk"><AppRoute><SpeculosDmk /></AppRoute></Route>
      <Route path="/app"><AppRoute><Overview /></AppRoute></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
