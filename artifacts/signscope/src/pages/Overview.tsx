import { useEffect, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Activity, ArrowRight, FileSearch, Fingerprint, MessageSquare, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { AuditLogEvent } from "@/lib/types";

interface Stats {
  totalRuns: number;
  safeFlows: number;
  blockedFlows: number;
  warningFlows: number;
  ledgerApprovalsRequired: number;
  walletCliStatus: string;
  recentRiskEvents: AuditLogEvent[];
}

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const flow = [
    { label: "User Intent", Icon: MessageSquare },
    { label: "Document Scan", Icon: FileSearch },
    { label: "Agent Tx", Icon: Activity },
    { label: "Diff Engine", Icon: ShieldCheck },
    { label: "Ledger Gate", Icon: Fingerprint },
  ];

  useEffect(() => {
    api.stats().then(setStats).catch(() => setStats(null));
  }, []);

  if (!stats) {
    return <div className="p-8 flex items-center justify-center h-full"><Activity className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-muted-foreground">Local SignScope metrics and the prompt-to-transaction firewall flow.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Runs" value={stats.totalRuns} icon={<Activity className="w-4 h-4 text-muted-foreground" />} />
        <MetricCard title="Safe Flows" value={stats.safeFlows} icon={<ShieldCheck className="w-4 h-4 text-secondary" />} />
        <MetricCard title="Blocked Flows" value={stats.blockedFlows} icon={<ShieldAlert className="w-4 h-4 text-destructive" />} />
        <MetricCard title="Ledger CLI Events" value={stats.ledgerApprovalsRequired} icon={<Fingerprint className="w-4 h-4 text-primary" />} />
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle className="text-lg">Firewall Flow</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] gap-3 items-center">
            {flow.map(({ label, Icon }, index) => (
              <div key={label} className="contents">
                <div className="border rounded-lg bg-card p-4 text-center font-semibold text-sm">
                  <Icon className="w-5 h-5 mx-auto mb-2 text-accent" />
                  {label}
                </div>
                {index < 4 && <ArrowRight className="hidden md:block w-5 h-5 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle className="text-lg">Recent Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10">
                <TableHead className="pl-6">Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verdict</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentRiskEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="pl-6 font-medium">{event.eventType}</TableCell>
                  <TableCell><StatusBadge status={event.status} /></TableCell>
                  <TableCell><StatusBadge status={event.verdict ?? "pending"} /></TableCell>
                </TableRow>
              ))}
              {stats.recentRiskEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No recent events recorded.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
