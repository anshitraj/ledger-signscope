import { useState } from "react";
import { useCompareTransaction } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeftRight, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

const SAFE_FLOW = {
  intent: { recipientName: "Alice", asset: "USDC", amount: 25, invoiceId: "INV-102", chain: "ethereum", confidence: 0.95, raw: "Pay 25 USDC to Alice for invoice INV-102" },
  transaction: { recipientName: "Alice", recipientAddress: "0xA11CE00000000000000000000000000000000000", asset: "USDC", amount: 25, chain: "ethereum", invoiceId: "INV-102" }
};

const ATTACK_FLOW = {
  intent: { recipientName: "Alice", asset: "USDC", amount: 25, invoiceId: "INV-102", chain: "ethereum", confidence: 0.95, raw: "Pay 25 USDC to Alice for invoice INV-102" },
  transaction: { recipientName: "Unknown", recipientAddress: "0xAttacker000000000000000000000000000000", asset: "ETH", amount: 0.25, chain: "ethereum" }
};

export default function TransactionDiff() {
  const [activeFlow, setActiveFlow] = useState<"safe" | "attack">("safe");
  
  const compareMutation = useCompareTransaction();
  
  const handleCompare = (flow: "safe" | "attack") => {
    setActiveFlow(flow);
    const data = flow === "safe" ? SAFE_FLOW : ATTACK_FLOW;
    compareMutation.mutate({ data });
  };

  const result = compareMutation.data;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ArrowLeftRight className="w-8 h-8 text-primary" />
          Transaction Diff Engine
        </h1>
        <p className="text-muted-foreground">
          Compares the user's parsed intent against the AI agent's actual generated calldata payload before it reaches the wallet.
        </p>
      </div>

      <div className="flex gap-4 p-1 bg-muted rounded-lg max-w-md">
        <Button 
          variant={activeFlow === "safe" ? "default" : "ghost"} 
          className={`flex-1 ${activeFlow === "safe" ? "bg-background text-foreground shadow-sm hover:bg-background" : ""}`}
          onClick={() => handleCompare("safe")}
        >
          <ShieldCheck className="w-4 h-4 mr-2 text-secondary" />
          Safe Flow
        </Button>
        <Button 
          variant={activeFlow === "attack" ? "default" : "ghost"} 
          className={`flex-1 ${activeFlow === "attack" ? "bg-background text-foreground shadow-sm hover:bg-background" : ""}`}
          onClick={() => handleCompare("attack")}
        >
          <ShieldAlert className="w-4 h-4 mr-2 text-destructive" />
          Attack Flow
        </Button>
      </div>

      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Diff Comparison</CardTitle>
              <CardDescription>Intent vs. Generated Payload</CardDescription>
            </div>
            {result && <StatusBadge status={result.verdict} className="px-3 py-1 text-sm" />}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!result ? (
            <div className="p-12 text-center text-muted-foreground">
              <Button onClick={() => handleCompare("safe")}>Run Comparison</Button>
            </div>
          ) : (
            <div className="space-y-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="w-[150px] pl-6 font-semibold">Field</TableHead>
                    <TableHead className="w-[300px] font-semibold text-muted-foreground">User Intent</TableHead>
                    <TableHead className="w-[300px] font-semibold">Agent Transaction</TableHead>
                    <TableHead className="text-right pr-6 font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.checks.map((check, i) => (
                    <TableRow key={i} className={check.status === "fail" ? "bg-destructive/5" : ""}>
                      <TableCell className="pl-6 font-medium font-mono text-xs">{check.field}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground bg-muted/20">
                        {check.intentValue || "-"}
                      </TableCell>
                      <TableCell className={`font-mono text-sm ${check.status === "fail" ? "text-destructive font-semibold" : ""}`}>
                        {check.txValue || "-"}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-muted-foreground max-w-[200px] truncate" title={check.explanation}>
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
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={result.verdict}
                  className={`p-4 rounded-lg border-2 flex items-start gap-4 ${
                    result.verdict === "safe" 
                      ? "bg-secondary/10 border-secondary/20" 
                      : "bg-destructive/10 border-destructive/20"
                  }`}
                >
                  <div className="mt-1">
                    {result.verdict === "safe" ? (
                      <ShieldCheck className="w-6 h-6 text-secondary" />
                    ) : (
                      <ShieldAlert className="w-6 h-6 text-destructive" />
                    )}
                  </div>
                  <div>
                    <h4 className={`font-semibold ${result.verdict === "safe" ? "text-secondary" : "text-destructive"}`}>
                      {result.verdict === "safe" ? "Safe — Ready for Ledger Review" : "Blocked — Mismatch Detected"}
                    </h4>
                    <p className="text-sm mt-1 opacity-90">{result.summary}</p>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
