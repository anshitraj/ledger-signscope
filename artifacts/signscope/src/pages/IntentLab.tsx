import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  FileSearch,
  Fingerprint,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Terminal,
  XCircle,
  ArrowRight,
  Info,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  INVOICE_PRESETS,
  type InvoicePreset,
} from "@/lib/sampleData";
import type { AiStatus, RequestCheckResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// Status card helper
// ---------------------------------------------------------------------------

function AiStatusCard({ status }: { status: AiStatus | null; }) {
  if (!status) {
    return (
      <Card className="border-stone-200">
        <CardContent className="py-3 px-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking Gemini status…
        </CardContent>
      </Card>
    );
  }

  if (!status.configured) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="py-3 px-4 space-y-1">
          <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
            <XCircle className="h-4 w-4" /> Gemini AI not configured
          </div>
          <p className="text-xs text-destructive/80">
            {status.error ?? "Add GEMINI_API_KEY to .env and restart the server."}
          </p>
          <code className="block text-xs bg-destructive/10 border border-destructive/20 rounded px-2 py-1 mt-1">
            GEMINI_API_KEY=your_key_here
          </code>
          <p className="text-xs text-muted-foreground">
            Get a free key at{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">
              aistudio.google.com/apikey
            </a>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardContent className="py-3 px-4 flex items-center gap-3 text-sm">
        <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
        <div>
          <span className="font-semibold text-purple-800">Gemini AI ready</span>
          <span className="text-purple-600 ml-2">·</span>
          <span className="text-purple-700 ml-2 font-mono text-xs">{status.model}</span>
        </div>
        <Badge className="ml-auto bg-purple-100 text-purple-800 border-purple-200 text-xs">
          configured
        </Badge>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pipeline step indicator
// ---------------------------------------------------------------------------

type StepState = "idle" | "running" | "completed" | "failed" | "blocked";

interface StepIndicatorProps {
  name: string;
  endpoint: string;
  state: StepState;
  result?: object | null;
  error?: string;
  duration?: number;
}

function StepIndicator({ name, endpoint, state, result, error, duration }: StepIndicatorProps) {
  const [expanded, setExpanded] = useState(false);

  const icon =
    state === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> :
    state === "blocked" ? <ShieldX className="h-5 w-5 text-destructive" /> :
    state === "failed" ? <XCircle className="h-5 w-5 text-destructive" /> :
    state === "running" ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> :
    <div className="h-5 w-5 rounded-full border-2 border-stone-300" />;

  const bg =
    state === "completed" ? "border-emerald-200 bg-emerald-50/50" :
    state === "blocked" || state === "failed" ? "border-destructive/30 bg-destructive/5" :
    state === "running" ? "border-primary/30 bg-primary/5" :
    "border-stone-200 bg-stone-50/50";

  return (
    <div className={`rounded-lg border p-3 transition-all ${bg}`}>
      <div className="flex items-center gap-3">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-stone-900">{name}</div>
          <code className="text-xs text-muted-foreground">{endpoint}</code>
        </div>
        {duration != null && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />{duration}ms
          </div>
        )}
        {(result || error) && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-muted-foreground hover:text-stone-900 transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {expanded && (result || error) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <pre className="mt-3 text-xs bg-black/90 text-green-400 rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap">
              {error ?? JSON.stringify(result, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verdict badge
// ---------------------------------------------------------------------------

function VerdictBanner({ verdict }: { verdict: "safe" | "warning" | "blocked" }) {
  if (verdict === "safe") {
    return (
      <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5 flex items-center gap-4">
        <ShieldCheck className="h-10 w-10 text-emerald-600 shrink-0" />
        <div>
          <div className="font-bold text-emerald-800 text-lg">Safe — Transaction Approved</div>
          <div className="text-emerald-700 text-sm">All checks passed. Proceed to Ledger Gate for signing.</div>
        </div>
      </div>
    );
  }
  if (verdict === "warning") {
    return (
      <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 p-5 flex items-center gap-4">
        <AlertTriangle className="h-10 w-10 text-yellow-600 shrink-0" />
        <div>
          <div className="font-bold text-yellow-800 text-lg">Warning — Manual Review Required</div>
          <div className="text-yellow-700 text-sm">Some checks raised warnings. Review before proceeding.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-5 flex items-center gap-4">
      <ShieldX className="h-10 w-10 text-destructive shrink-0" />
      <div>
        <div className="font-bold text-destructive text-lg">Blocked — Ledger Signing NOT Triggered</div>
        <div className="text-destructive/80 text-sm">Transaction mismatch detected. SignScope blocked the transaction before it could reach the Ledger device.</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invoice preset panel
// ---------------------------------------------------------------------------

function InvoicePresetPanel({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (p: InvoicePreset) => void;
}) {
  const riskStyle = (risk: InvoicePreset["risk"]) => {
    if (risk === "safe")    return "border-emerald-300 bg-emerald-50 hover:bg-emerald-100";
    if (risk === "warning") return "border-yellow-300 bg-yellow-50 hover:bg-yellow-100";
    return "border-red-300 bg-red-50 hover:bg-red-100";
  };
  const riskBadge = (risk: InvoicePreset["risk"]) => {
    if (risk === "safe")    return "bg-emerald-100 text-emerald-800";
    if (risk === "warning") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };
  const riskLabel = (risk: InvoicePreset["risk"]) =>
    risk === "safe" ? "SAFE" : risk === "warning" ? "WARN" : "ATTACK";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Invoice Presets</span>
        <span className="text-xs text-stone-400">— click to load</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
        {INVOICE_PRESETS.map((p) => {
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className={`text-left rounded-lg border-2 p-3 transition-all ${riskStyle(p.risk)} ${
                isSelected ? "ring-2 ring-offset-1 ring-stone-400" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-mono text-stone-700">{p.id}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${riskBadge(p.risk)}`}>
                  {riskLabel(p.risk)}
                </span>
              </div>
              <div className="text-xs font-medium text-stone-800 leading-tight">{p.label}</div>
              <div className="text-[10px] text-stone-500 mt-0.5">{p.vendor} · {p.amount}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function IntentLab() {
  const { toast } = useToast();

  const [userRequest, setUserRequest] = useState("");
  const [invoiceText, setInvoiceText] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [result, setResult] = useState<RequestCheckResult | null>(null);
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiExpanded, setGeminiExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Load AI status on mount
  useEffect(() => {
    api.aiStatus()
      .then(setAiStatus)
      .catch(() => setAiStatus({
        configured: false,
        model: "unknown",
        agentMode: "none",
        keySource: "none",
        error: "Could not reach backend. Start server with: npm run dev",
      }));
  }, []);

  const loadPreset = useCallback((p: InvoicePreset) => {
    setUserRequest(p.request);
    setInvoiceText(p.invoice);
    setSelectedPreset(p.id);
    setResult(null);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setUserRequest("");
    setInvoiceText("");
    setSelectedPreset(null);
    setResult(null);
    setChatResponse(null);
    setError(null);
    setGeminiExpanded(false);
  }, []);

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const runCheck = useCallback(async () => {
    if (!userRequest.trim()) {
      toast({ title: "User request required", description: "Enter a payment request to check.", variant: "destructive" });
      return;
    }

    setRunning(true);
    setResult(null);
    setChatResponse(null);
    setError(null);
    setGeminiExpanded(false);

    try {
      const res = await api.requestCheck({
        userRequest: userRequest.trim(),
        invoiceText: invoiceText.trim(),
        mode: "real",
      });

      // Non-payment chat response from backend
      if ((res as { isChat?: boolean }).isChat) {
        setChatResponse((res as { chatResponse?: string }).chatResponse ?? null);
        setRunning(false);
        return;
      }

      setResult(res);

      // Save to sessionStorage for Ledger Gate page
      sessionStorage.setItem("signscope_last_run", JSON.stringify(res));

      if (res.verdict === "safe") {
        toast({ title: "✅ Safe", description: "All checks passed. Ledger Gate is ready." });
      } else if (res.verdict === "warning") {
        toast({ title: "⚠️ Warning", description: "Manual review recommended.", variant: "destructive" });
      } else {
        toast({ title: "🚫 Blocked", description: "Transaction blocked. Ledger signing NOT triggered.", variant: "destructive" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast({ title: "Pipeline failed", description: msg, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }, [userRequest, invoiceText, toast]);

  // Step states derived from result
  const stepStates = result
    ? result.steps.map((s) => ({
        state: s.status as StepState,
        result: s.response,
        error: s.error,
        duration: s.startedAt && s.completedAt
          ? Math.round(Date.parse(s.completedAt) - Date.parse(s.startedAt))
          : undefined,
      }))
    : [];

  const stepDefs = [
    { name: "Parse Intent", endpoint: "POST /api/parse-intent" },
    { name: "Scan Invoice", endpoint: "POST /api/scan-document" },
    { name: "Gemini Agent Transaction", endpoint: "POST /api/agent/generate-transaction" },
    { name: "SignScope Transaction Diff", endpoint: "POST /api/compare-transaction" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-5xl"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileSearch className="w-8 h-8 text-primary" />
          Request Check
        </h1>
        <p className="text-muted-foreground">
          Enter a payment request and invoice. SignScope calls Gemini as the AI agent,
          then deterministically validates the proposed transaction before any Ledger action.
        </p>
      </div>

      {/* AI Status */}
      <AiStatusCard status={aiStatus} />

      {/* Invoice preset picker */}
      <InvoicePresetPanel selected={selectedPreset} onSelect={loadPreset} />

      {/* Inputs */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Payment Request</Label>
            {selectedPreset && (
              <span className="text-xs text-stone-500 font-mono bg-stone-100 px-2 py-0.5 rounded">
                loaded: {selectedPreset}
              </span>
            )}
          </div>
          <Textarea
            id="user-request"
            placeholder="Pay 0.001 ETH to Alice for invoice INV-102"
            value={userRequest}
            onChange={(e) => { setUserRequest(e.target.value); setSelectedPreset(null); }}
            className="min-h-28 font-mono text-sm resize-none"
            disabled={running}
          />
          <p className="text-xs text-muted-foreground">
            What you want to pay. Gemini acts as AI agent receiving this instruction.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">Invoice / Document Text</Label>
          <Textarea
            id="invoice-text"
            placeholder="Invoice INV-102&#10;Vendor: Alice&#10;Amount: 0.001 ETH&#10;..."
            value={invoiceText}
            onChange={(e) => { setInvoiceText(e.target.value); setSelectedPreset(null); }}
            className="min-h-28 font-mono text-sm resize-none"
            disabled={running}
          />
          <p className="text-xs text-muted-foreground">
            The invoice Gemini reads. Attack presets (red) contain prompt-injection.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          id="run-check-btn"
          className="min-w-40"
          onClick={runCheck}
          disabled={running || !userRequest.trim()}
        >
          {running ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running pipeline…</>
          ) : (
            <><Send className="w-4 h-4 mr-2" /> Run Check</>
          )}
        </Button>
        <Button variant="outline" onClick={reset} disabled={running}>
          <RefreshCw className="w-4 h-4 mr-2" /> Reset
        </Button>
        {result && (
          <a href="/app/ledger" className="ml-auto">
            <Button variant="outline" className="gap-2">
              Ledger Gate <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
        )}
      </div>

      {/* Hard error */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start gap-2">
            <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-destructive text-sm">Pipeline failed</div>
              <div className="text-sm text-destructive/80 mt-1 font-mono whitespace-pre-wrap">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Chat response (non-payment input) */}
      {chatResponse && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600 shrink-0" />
              <span className="font-semibold text-purple-800">SignScope Assistant</span>
            </div>
            <div className="text-sm text-purple-900 space-y-1.5">
              {chatResponse.split("\n").map((line, i) => {
                if (!line) return <div key={i} className="h-1" />;
                // Bold **text**
                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                return (
                  <div key={i}>
                    {parts.map((p, j) =>
                      p.startsWith("**") && p.endsWith("**")
                        ? <strong key={j}>{p.slice(2, -2)}</strong>
                        : p.startsWith("`") && p.endsWith("`")
                        ? <code key={j} className="bg-purple-100 px-1 rounded text-xs font-mono">{p.slice(1, -1)}</code>
                        : <span key={j}>{p}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-1 flex-wrap">
              {["Pay 0.001 ETH to Alice for invoice INV-102", "Send 0.05 ETH to Bob for INV-205"].map((ex) => (
                <button
                  key={ex}
                  onClick={() => { setUserRequest(ex); setChatResponse(null); setSelectedPreset(null); }}
                  className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-1.5 rounded-lg border border-purple-200 font-mono transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Pipeline timeline */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pipeline Steps</div>
        <div className="space-y-2">
          {stepDefs.map((def, i) => {
            const s = stepStates[i];
            return (
              <StepIndicator
                key={def.name}
                name={def.name}
                endpoint={def.endpoint}
                state={running && !result ? (i === 0 ? "running" : "idle") : (s?.state ?? "idle")}
                result={s?.result}
                error={s?.error}
                duration={s?.duration}
              />
            );
          })}
        </div>
      </div>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Verdict */}
          <VerdictBanner verdict={result.verdict} />

          {/* 4-col summary grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Parsed Intent */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Parsed Intent</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1.5 text-sm font-mono">
                <div><span className="text-muted-foreground">action:</span> {result.intent.action}</div>
                <div><span className="text-muted-foreground">to:</span> {result.intent.recipientName ?? "—"}</div>
                <div><span className="text-muted-foreground">amount:</span> {result.intent.amount} {result.intent.asset}</div>
                <div><span className="text-muted-foreground">invoice:</span> {result.intent.invoiceId ?? "—"}</div>
                <div><span className="text-muted-foreground">confidence:</span> {Math.round(result.intent.confidence * 100)}%</div>
              </CardContent>
            </Card>

            {/* Invoice Risk */}
            <Card className={`shadow-sm ${result.documentScan.verdict === "malicious" ? "border-destructive/40" : result.documentScan.verdict === "suspicious" ? "border-yellow-400/40" : "border-emerald-200"}`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Invoice Risk</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`font-bold capitalize ${result.documentScan.verdict === "malicious" ? "text-destructive" : result.documentScan.verdict === "suspicious" ? "text-yellow-600" : "text-emerald-700"}`}>
                    {result.documentScan.verdict}
                  </span>
                  <span className="text-muted-foreground text-xs">({result.documentScan.riskScore}/100)</span>
                </div>
                {result.documentScan.findings.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {result.documentScan.findings.slice(0, 3).map((f) => (
                      <span key={f} className="text-xs rounded border border-destructive/20 bg-destructive/10 text-destructive px-1.5 py-0.5">{f}</span>
                    ))}
                    {result.documentScan.findings.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{result.documentScan.findings.length - 3} more</span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-emerald-700">No injection signals found</div>
                )}
              </CardContent>
            </Card>

            {/* Agent Transaction */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                  <Bot className="inline h-3 w-3 mr-1" />Gemini Proposed
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1.5 text-sm font-mono">
                <div><span className="text-muted-foreground">to:</span> {result.agentTransaction.recipientName ?? "—"}</div>
                <div className="text-xs text-muted-foreground truncate" title={result.agentTransaction.to}>{result.agentTransaction.to}</div>
                <div><span className="text-muted-foreground">amount:</span> {result.agentTransaction.amount} {result.agentTransaction.asset}</div>
                <div className="text-xs">
                  <span className={`px-1.5 py-0.5 rounded border text-xs ${result.agentTransaction.sourceOfInstruction === "invoice" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                    from: {result.agentTransaction.sourceOfInstruction}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Risk score */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Risk Score</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-4xl font-black font-mono mb-2 text-stone-900">
                  {result.comparison.riskScore}
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${result.comparison.riskScore >= 70 ? "bg-destructive" : result.comparison.riskScore >= 30 ? "bg-yellow-500" : "bg-emerald-500"}`}
                    style={{ width: `${result.comparison.riskScore}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-2">{result.comparison.summary}</div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction diff table */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSearch className="h-4 w-4" /> SignScope Diff
                <Badge className="ml-auto" variant={result.comparison.verdict === "safe" ? "outline" : "destructive"}>
                  {result.comparison.verdict}
                </Badge>
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/10">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground w-40">Check</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Expected (User Intent)</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Actual (Gemini Agent)</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground w-24">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.comparison.checks.map((check) => (
                    <tr key={check.key} className={`border-b last:border-0 ${check.status === "fail" ? "bg-destructive/5" : ""}`}>
                      <td className="px-4 py-2.5 font-medium font-mono text-xs">{check.label}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground bg-muted/10">{check.expected ?? "—"}</td>
                      <td className={`px-4 py-2.5 font-mono text-xs ${check.status === "fail" ? "text-destructive font-semibold" : ""}`}>
                        {check.actual ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {check.status === "pass" && <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" />}
                        {check.status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-500 inline" />}
                        {check.status === "fail" && <XCircle className="h-4 w-4 text-destructive inline" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Gemini raw response panel */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader
              className="bg-muted/30 border-b pb-4 cursor-pointer"
              onClick={() => setGeminiExpanded((e) => !e)}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-base flex-1">Gemini Raw Response</CardTitle>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                  {result.gemini.model}
                </Badge>
                <Badge
                  variant="outline"
                  className={result.gemini.jsonParseStatus === "success" ? "border-emerald-300 text-emerald-700" : "border-yellow-300 text-yellow-700"}
                >
                  {result.gemini.jsonParseStatus}
                </Badge>
                {geminiExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
            <AnimatePresence>
              {geminiExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="p-3 bg-muted/20 border-b flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">RAW GEMINI OUTPUT</span>
                      <button
                        onClick={() => copy(result.gemini.rawResponse, "raw")}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-stone-900"
                      >
                        <Copy className="h-3 w-3" />
                        {copied === "raw" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <pre className="bg-black/90 text-green-400 text-xs p-4 overflow-auto max-h-64 whitespace-pre-wrap">
                      {result.gemini.rawResponse}
                    </pre>
                    <div className="p-3 bg-muted/20 border-b border-t flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">PARSED TRANSACTION JSON</span>
                      <button
                        onClick={() => copy(JSON.stringify(result.gemini.parsedJson, null, 2), "parsed")}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-stone-900"
                      >
                        <Copy className="h-3 w-3" />
                        {copied === "parsed" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <pre className="bg-black/90 text-emerald-400 text-xs p-4 overflow-auto max-h-48 whitespace-pre-wrap">
                      {JSON.stringify(result.gemini.parsedJson, null, 2)}
                    </pre>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Ledger eligibility */}
          <Card className={`shadow-sm ${result.ledger.eligibleForDryRun ? "border-emerald-200" : "border-destructive/30"}`}>
            <CardContent className="py-4 px-5 flex items-start gap-3">
              <Fingerprint className={`h-5 w-5 shrink-0 mt-0.5 ${result.ledger.eligibleForDryRun ? "text-emerald-600" : "text-destructive"}`} />
              <div className="flex-1">
                <div className="font-semibold text-sm">
                  {result.ledger.eligibleForDryRun ? "Ledger Gate eligible" : "Ledger Gate blocked"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{result.ledger.reason}</div>
              </div>
              {result.ledger.eligibleForDryRun && (
                <a href="/app/ledger">
                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                    Open Ledger Gate <ArrowRight className="h-3 w-3" />
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
