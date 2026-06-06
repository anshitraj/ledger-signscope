import { useGetAuditLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ListChecks, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function AuditLogs() {
  const { data: logs, isLoading } = useGetAuditLogs();

  const handleExport = () => {
    if (!logs) return;
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signscope-audit-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 h-full flex flex-col pb-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="w-8 h-8 text-primary" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">
            Immutable record of all prompt-to-transaction validations and Ledger interactions.
          </p>
        </div>
        <Button onClick={handleExport} disabled={!logs?.length} className="bg-sidebar text-sidebar-foreground hover:bg-sidebar/90">
          <Download className="w-4 h-4 mr-2" /> Export JSON
        </Button>
      </div>

      <Card className="flex-1 shadow-sm border-border flex flex-col overflow-hidden">
        <CardHeader className="bg-muted/30 border-b py-4 shrink-0">
          <CardTitle className="text-lg">Event History</CardTitle>
          <CardDescription>All recorded firewall decisions</CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-[180px] pl-6">Timestamp</TableHead>
                  <TableHead className="min-w-[200px]">User Intent</TableHead>
                  <TableHead>Extracted Recipient</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Diff Status</TableHead>
                  <TableHead className="pr-6">Ledger Gate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                      {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-medium text-sm max-w-[250px] truncate" title={log.userIntent}>
                      {log.userIntent}
                    </TableCell>
                    <TableCell className="font-mono text-xs p-1 bg-muted/20 rounded truncate max-w-[150px]">
                      {log.extractedRecipient || "None"}
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono text-xs font-semibold ${log.riskScore > 70 ? 'text-destructive' : log.riskScore > 30 ? 'text-yellow-600' : 'text-secondary'}`}>
                        {log.riskScore}/100
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="pr-6">
                      <StatusBadge status={log.ledgerGateStatus} />
                    </TableCell>
                  </TableRow>
                ))}
                {(!logs || logs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No audit logs found. Run some simulations to generate data.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
