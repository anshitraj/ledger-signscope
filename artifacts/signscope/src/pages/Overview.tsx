import { useGetStats } from "@workspace/api-client-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ShieldCheck, ShieldAlert, AlertTriangle, Fingerprint, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";

export default function Overview() {
  const { data: stats, isLoading } = useGetStats();

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full"><Activity className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-muted-foreground">Real-time simulation metrics for the SignScope firewall.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Simulations" 
          value={stats?.totalSimulations ?? 0}
          icon={<Activity className="w-4 h-4 text-muted-foreground" />}
        />
        <MetricCard 
          title="Safe Flows" 
          value={stats?.safeFlows ?? 0}
          icon={<ShieldCheck className="w-4 h-4 text-secondary" />}
        />
        <MetricCard 
          title="Blocked Threats" 
          value={stats?.blockedFlows ?? 0}
          icon={<ShieldAlert className="w-4 h-4 text-destructive" />}
        />
        <MetricCard 
          title="Ledger Reviews Pending" 
          value={stats?.ledgerApprovalsRequired ?? 0}
          icon={<Fingerprint className="w-4 h-4 text-primary" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-border">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg">Recent Risk Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 hover:bg-muted/10">
                  <TableHead className="pl-6">Intent</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.recentRiskEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="pl-6 font-medium max-w-[200px] truncate" title={event.userIntent}>
                      {event.userIntent}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-muted rounded-full h-1.5 max-w-[60px]">
                          <div 
                            className={`h-1.5 rounded-full ${event.riskScore > 70 ? 'bg-destructive' : event.riskScore > 30 ? 'bg-yellow-500' : 'bg-secondary'}`}
                            style={{ width: `${event.riskScore}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{event.riskScore}/100</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={event.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {(!stats?.recentRiskEvents || stats.recentRiskEvents.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No recent events recorded.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm border-border">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg">How SignScope Works</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-border/50 before:to-transparent">
              {[
                { step: 1, title: "Intent Capture", desc: "User request is parsed into structured data." },
                { step: 2, title: "Document Scan", desc: "Linked files scanned for prompt injection." },
                { step: 3, title: "Transaction Diff", desc: "Agent calldata compared against user intent." },
                { step: 4, title: "Ledger Gate", desc: "Final verification via Speculos / Wallet CLI." },
              ].map((item, i) => (
                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-accent text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <span className="text-sm font-bold">{item.step}</span>
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-card shadow-sm">
                    <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
