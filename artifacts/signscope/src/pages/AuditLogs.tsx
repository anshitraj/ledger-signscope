import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Download, Eye, ListChecks, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { AuditLogEvent } from "@/lib/types";

export default function AuditLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLogEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AuditLogEvent | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      setLogs(await api.auditLogs());
    } catch (err) {
      toast({
        title: "Failed to load audit logs",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    return logs.filter((log) => JSON.stringify(log).toLowerCase().includes(needle));
  }, [logs, search]);

  /** Uses the real backend /api/audit-logs/export endpoint — file-backed data */
  const handleExport = () => {
    const url = api.exportAuditLogs();
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `signscope-audit-${new Date().toISOString()}.json`;
    anchor.click();
    toast({ title: "Export started", description: "Downloading real audit log from backend." });
  };

  const clear = async () => {
    if (!window.confirm("Clear all audit logs? This is irreversible.")) return;
    try {
      await api.clearAuditLogs();
      setLogs([]);
      toast({ title: "Audit logs cleared" });
    } catch (err) {
      toast({
        title: "Clear failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 h-full flex flex-col pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="w-8 h-8 text-primary" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">File-backed record of firewall decisions and Wallet CLI attempts.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={load}
            disabled={isLoading}
            id="audit-refresh-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExport}
            disabled={!logs.length}
            id="audit-export-btn"
            className="bg-sidebar text-sidebar-foreground hover:bg-sidebar/90"
          >
            <Download className="w-4 h-4 mr-2" /> Export JSON
          </Button>
          <Button variant="outline" onClick={clear} disabled={!logs.length} id="audit-clear-btn">
            <Trash2 className="w-4 h-4 mr-2" /> Clear
          </Button>
        </div>
      </div>

      <Input
        id="audit-search-input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search logs by event type, status, verdict..."
        className="max-w-md"
      />

      <Card className="flex-1 shadow-sm border-border flex flex-col overflow-hidden">
        <CardHeader className="bg-muted/30 border-b py-4 shrink-0">
          <CardTitle className="text-lg">Event History</CardTitle>
          <CardDescription>
            {logs.length} total event{logs.length !== 1 ? "s" : ""} — all recorded SignScope pipeline runs
          </CardDescription>
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
                  <TableHead className="w-[170px] pl-6">Timestamp</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead>User Request</TableHead>
                  <TableHead className="pr-6 text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                      {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-medium text-sm font-mono">{log.eventType}</TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground">{log.source ?? log.mode}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.verdict ?? "pending"} />
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <span className="text-xs text-muted-foreground truncate block" title={log.userRequest ?? ""}>
                        {log.userRequest ? log.userRequest.slice(0, 40) + (log.userRequest.length > 40 ? "…" : "") : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(log)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {logs.length === 0
                        ? "No audit logs yet. Run a Request Check first."
                        : "No results match your search."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Audit Event — {selected?.eventType}</DialogTitle>
          </DialogHeader>
          <pre className="bg-black text-green-400 text-xs rounded-lg p-4 max-h-[60vh] overflow-auto whitespace-pre-wrap">
            {selected ? JSON.stringify(selected, null, 2) : ""}
          </pre>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
