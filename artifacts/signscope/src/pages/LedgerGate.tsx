import { useState } from "react";
import { useSimulateLedgerGate } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Terminal, Check, X, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MOCK_TX_SAFE = { recipientName: "Alice", recipientAddress: "0xA11C...", asset: "USDC", amount: 25, chain: "ethereum" };
const MOCK_TX_ATTACK = { recipientName: "Unknown", recipientAddress: "0xAttacker...", asset: "ETH", amount: 0.25, chain: "ethereum" };

export default function LedgerGate() {
  const [verdict, setVerdict] = useState<"safe" | "blocked" | null>(null);
  const simulateGate = useSimulateLedgerGate();
  
  const handleSimulate = (flowVerdict: "safe" | "blocked") => {
    setVerdict(flowVerdict);
    simulateGate.mutate({ 
      data: { 
        verdict: flowVerdict, 
        transaction: flowVerdict === "safe" ? MOCK_TX_SAFE : MOCK_TX_ATTACK 
      } 
    });
  };

  const handleAction = (action: "approve" | "reject") => {
    if (!verdict) return;
    simulateGate.mutate({
      data: {
        verdict,
        transaction: verdict === "safe" ? MOCK_TX_SAFE : MOCK_TX_ATTACK,
        action
      }
    });
  };

  const result = simulateGate.data;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-4xl"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Fingerprint className="w-8 h-8 text-sidebar-primary" />
            Ledger Gate
          </h1>
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border uppercase text-[10px] tracking-widest font-bold">
            Simulation Mode
          </Badge>
        </div>
        <p className="text-muted-foreground">
          The final approval step. SignScope controls the wallet CLI connection and will block payload signing if a mismatch was detected.
        </p>
      </div>

      <div className="flex gap-4">
        <Button variant={verdict === "safe" ? "default" : "outline"} onClick={() => handleSimulate("safe")}>
          Test Safe Payload
        </Button>
        <Button variant={verdict === "blocked" ? "destructive" : "outline"} onClick={() => handleSimulate("blocked")}>
          Test Blocked Payload
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div 
            key={verdict + (result.gateStatus)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid md:grid-cols-2 gap-8"
          >
            {/* Device Mockup */}
            <div className="space-y-4">
              <div className="bg-[#1C1C1E] rounded-[2rem] p-8 border-4 border-[#2C2C2E] shadow-2xl relative overflow-hidden flex flex-col min-h-[400px]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-[#2C2C2E] rounded-b-lg" />
                
                <div className="flex items-center justify-between mb-8 text-white/50 text-xs">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                  </div>
                  <span className="font-mono">Ledger Nano S Plus</span>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <div className="bg-black border border-white/10 rounded-lg p-6 font-mono text-center flex flex-col gap-4">
                    {result.gateStatus === "blocked" ? (
                      <>
                        <ShieldAlert className="w-8 h-8 text-red-500 mx-auto" />
                        <div className="text-red-500 font-bold uppercase tracking-wider text-sm">Action Blocked</div>
                        <div className="text-xs text-white/60">SignScope rejected payload before device prompt.</div>
                      </>
                    ) : result.gateStatus === "approved" ? (
                      <>
                        <Check className="w-8 h-8 text-green-500 mx-auto" />
                        <div className="text-green-500 font-bold uppercase tracking-wider text-sm">Signed</div>
                      </>
                    ) : result.gateStatus === "rejected" ? (
                      <>
                        <X className="w-8 h-8 text-red-500 mx-auto" />
                        <div className="text-red-500 font-bold uppercase tracking-wider text-sm">User Rejected</div>
                      </>
                    ) : (
                      <>
                        <div className="text-white font-bold uppercase tracking-wider text-sm border-b border-white/20 pb-2">Review Tx</div>
                        <div className="text-xs text-white/80 mt-2 space-y-2 text-left">
                          <div className="grid grid-cols-2"><span className="text-white/50">Amount:</span> {MOCK_TX_SAFE.amount} {MOCK_TX_SAFE.asset}</div>
                          <div className="grid grid-cols-2"><span className="text-white/50">To:</span> <span className="truncate">{MOCK_TX_SAFE.recipientAddress}</span></div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button 
                    variant="outline" 
                    className="bg-[#2C2C2E] border-none text-white hover:bg-[#3C3C3E]"
                    disabled={!result.allowApproval}
                    onClick={() => handleAction("reject")}
                  >
                    Reject
                  </Button>
                  <Button 
                    className="bg-white text-black hover:bg-white/90"
                    disabled={!result.allowApproval}
                    onClick={() => handleAction("approve")}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            </div>

            {/* Logs & Code */}
            <div className="space-y-4">
              <Card className="shadow-sm border-border h-full flex flex-col">
                <CardHeader className="bg-muted/30 border-b py-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Terminal className="w-4 h-4" /> System Output
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col">
                  <div className="p-4 bg-muted/10 border-b flex items-center gap-3">
                    <Badge variant={result.gateStatus === "blocked" ? "destructive" : result.gateStatus === "approved" ? "default" : "secondary"}>
                      {result.gateStatus.replace("_", " ").toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium">{result.message}</span>
                  </div>
                  
                  <div className="p-4 flex-1 bg-black text-green-400 font-mono text-xs overflow-auto">
                    <div className="opacity-50 mb-2">$ ledger-wallet-cli --dry-run</div>
                    <pre className="whitespace-pre-wrap">{result.commandPreview}</pre>
                    
                    <div className="opacity-50 mt-6 mb-2"># Speculos Output</div>
                    <pre className="whitespace-pre-wrap text-blue-400">{result.dryRunPreview}</pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
