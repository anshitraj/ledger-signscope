import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ArrowLeftRight, CheckCircle2, Loader2, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { ATTACK_FLOW_TX, CLEAN_SCAN, SAFE_FLOW_TX, SAFE_INTENT } from "@/lib/sampleData";
import type { ComparisonResult, GeneratedTransaction } from "@/lib/types";

export default function TransactionDiff() {
  const [activeFlow, setActiveFlow] = useState<"safe" | "attack" | "custom">("safe");
  const [customTx, setCustomTx] = useState(JSON.stringify(SAFE_FLOW_TX, null, 2));
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async (flow: "safe" | "attack" | "custom") => {
    setActiveFlow(flow);
    setIsPending(true);
    setError(null);
    try {
      const generatedTransaction =
        flow === "safe" ? SAFE_FLOW_TX : flow === "attack" ? ATTACK_FLOW_TX : (JSON.parse(customTx) as GeneratedTransaction);
      const res = await api.compareTransaction({ intent: SAFE_INTENT, documentScan: CLEAN_SCAN, generatedTransaction });
      setResult(res.comparison);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-6xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ArrowLeftRight className="w-8 h-8 text-primary" />
          Transaction Diff Engine
        </h1>
        <p className="text-muted-foreground">
          Compare user intent, document risk, and the agent-generated transaction before any Ledger action.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 p-1 bg-muted rounded-lg max-w-2xl">
        <Button variant={activeFlow === "safe" ? "default" : "ghost"} className="flex-1" onClick={() => handleCompare("safe")}>
          <ShieldCheck className="w-4 h-4 mr-2 text-secondary" />
          Safe Flow
        </Button>
        <Button variant={activeFlow === "attack" ? "default" : "ghost"} className="flex-1" onClick={() => handleCompare("attack")}>
          <ShieldAlert className="w-4 h-4 mr-2 text-destructive" />
          Attack Flow
        </Button>
        <Button variant={activeFlow === "custom" ? "default" : "ghost"} className="flex-1" onClick={() => handleCompare("custom")}>
          <ArrowLeftRight className="w-4 h-4 mr-2 text-primary" />
          Custom Flow
        </Button>
      </div>

      {activeFlow === "custom" && (
        <Card className="shadow-sm border-border">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-base">Custom Generated Transaction</CardTitle>
            <CardDescription>Edit JSON and run Custom Flow.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Textarea value={customTx} onChange={(event) => setCustomTx(event.target.value)} className="min-h-52 font-mono text-xs" />
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Diff Comparison</CardTitle>
              <CardDescription>Intent vs. generated payload</CardDescription>
            </div>
            {result && <StatusBadge status={result.verdict} className="px-3 py-1 text-sm" />}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!result ? (
            <div className="p-12 text-center text-muted-foreground">
              <Button onClick={() => handleCompare("safe")} disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Run Comparison
              </Button>
              {error && <div className="mt-4 text-sm text-destructive">{error}</div>}
            </div>
          ) : (
            <div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="w-[150px] pl-6 font-semibold">Field</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">User Intent</TableHead>
                    <TableHead className="font-semibold">Agent Transaction</TableHead>
                    <TableHead className="text-right pr-6 font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.checks.map((check) => (
                    <TableRow key={check.key} className={check.status === "fail" ? "bg-destructive/5" : ""}>
                      <TableCell className="pl-6 font-medium font-mono text-xs">{check.label}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground bg-muted/20">{check.expected || "-"}</TableCell>
                      <TableCell className={check.status === "fail" ? "font-mono text-sm text-destructive font-semibold" : "font-mono text-sm"}>
                        {check.actual || "-"}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-muted-foreground max-w-[240px] truncate" title={check.explanation}>
                            {check.explanation}
                          </span>
                          {check.status === "pass" && <CheckCircle2 className="w-5 h-5 text-secondary" />}
                          {check.status === "warning" && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                          {check.status === "fail" && <XCircle className="w-5 h-5 text-destructive" />}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="p-6 bg-muted/10 border-t">
                <div
                  className={`p-4 rounded-lg border-2 flex items-start gap-4 ${
                    result.verdict === "safe"
                      ? "bg-secondary/10 border-secondary/20"
                      : result.verdict === "warning"
                        ? "bg-yellow-500/10 border-yellow-500/20"
                        : "bg-destructive/10 border-destructive/20"
                  }`}
                >
                  {result.verdict === "safe" ? (
                    <ShieldCheck className="w-6 h-6 text-secondary mt-1" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-destructive mt-1" />
                  )}
                  <div>
                    <h4 className="font-semibold">
                      {result.verdict === "safe"
                        ? "Safe Flow: Ready for Ledger review"
                        : result.verdict === "warning"
                          ? "Warning Flow: Manual review required"
                          : "Attack Flow: Blocked before signing"}
                    </h4>
                    <p className="text-sm mt-1 opacity-90">{result.summary}</p>
                  </div>
                </div>
              </div>
              {error && <div className="px-6 pb-6 text-sm text-destructive">{error}</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
