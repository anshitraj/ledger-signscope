import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Fingerprint, Loader2, ShieldX, Terminal, AlertTriangle,
  CheckCircle2, ArrowLeft, ExternalLink, Cpu, Key,
  PenLine, Lock, ChevronRight, Usb, HardDrive,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { RequestCheckResult, Settings, Verdict, WalletCliResult } from "@/lib/types";

const CONFIRMATION = "I UNDERSTAND THIS WILL REQUEST LEDGER SIGNING";
const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api";

// ---------------------------------------------------------------------------
// Speculos DMK inline signing
// ---------------------------------------------------------------------------

type DmkStep = "idle" | "connecting" | "address" | "signing" | "done" | "error";

interface DmkState {
  step: DmkStep;
  sessionId: string | null;
  address: string | null;
  sig: { v: string; r: string; s: string } | null;
  screens: string[];
  error: string | null;
}

const DMK_INIT: DmkState = {
  step: "idle",
  sessionId: null,
  address: null,
  sig: null,
  screens: [],
  error: null,
};

async function dmkFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data as T;
}

function SpeculosDmkCard({ verdict, isBlocked }: { verdict: string; isBlocked: boolean }) {
  const [dmk, setDmk] = useState<DmkState>(DMK_INIT);
  const running = ["connecting", "address", "signing"].includes(dmk.step);

  function set(patch: Partial<DmkState>) {
    setDmk((s) => ({ ...s, ...patch }));
  }

  const RAW_TX = "02ee0180843b9aca00843b9aca0082520894a11ce0000000000000000000000000000000000087038d7ea4c6800080c0";

  async function runDmk() {
    if (isBlocked) return;
    setDmk({ ...DMK_INIT, step: "connecting" });

    // 1. Connect
    let sessionId: string;
    try {
      const conn = await dmkFetch<{ ok: boolean; sessionId: string }>("/dmk/connect", { method: "POST" });
      sessionId = conn.sessionId;
      set({ sessionId });
    } catch (e) {
      set({ step: "error", error: `Connect failed: ${String(e)}` });
      return;
    }

    // 2. Get address
    set({ step: "address" });
    try {
      const addr = await dmkFetch<{ ok: boolean; address: string }>("/dmk/get-address", {
        method: "POST",
        body: JSON.stringify({ sessionId, derivationPath: "44'/60'/0'/0/0" }),
      });
      set({ address: addr.address });
    } catch (e) {
      set({ step: "error", error: `Get-address failed: ${String(e)}` });
      return;
    }

    // 3. Sign
    set({ step: "signing" });
    try {
      const sig = await dmkFetch<{ ok: boolean; v: string; r: string; s: string; screens: string[] }>("/dmk/sign-auto", {
        method: "POST",
        body: JSON.stringify({ sessionId, verdict }),
      });
      set({ step: "done", sig: { v: sig.v, r: sig.r, s: sig.s }, screens: sig.screens ?? [] });
    } catch (e) {
      set({ step: "error", error: String(e) });
    }
  }

  const stepIdx = ["idle", "connecting", "address", "signing", "done", "error"].indexOf(dmk.step);

  return (
    <Card className={`shadow-sm overflow-hidden ${isBlocked ? "opacity-60 pointer-events-none" : "border-emerald-200"}`}>
      <CardHeader className="bg-emerald-50 border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base text-emerald-900 flex items-center gap-2">
                Speculos Emulator
                <span className="text-[9px] font-bold bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded">DMK</span>
                <span className="text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded animate-pulse">LIVE</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Ledger Nano S+ emulator via <code className="bg-emerald-100 px-1 rounded">speculosTransportFactory</code> · localhost:5000 · Real ECDSA signing
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={runDmk}
            disabled={running || isBlocked}
            className="bg-emerald-700 hover:bg-emerald-800 text-white"
            size="sm"
          >
            {running ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Signing…</> : <><Cpu className="w-3.5 h-3.5 mr-1.5" /> Sign with Speculos</>}
          </Button>
        </div>
      </CardHeader>

      {isBlocked && (
        <div className="px-4 py-3 bg-destructive/5 border-b text-sm text-destructive flex items-center gap-2">
          <ShieldX className="h-4 w-4" /> Blocked by SignScope — Speculos signing not triggered.
        </div>
      )}

      <CardContent className="pt-4 pb-4 space-y-4">
        {/* Step indicators */}
        {dmk.step !== "idle" && (
          <div className="space-y-1.5">
            {[
              { label: "DMK Connect (speculosTransportFactory)", sub: "POST /api/dmk/connect", idx: 1 },
              { label: "Get Ethereum Address (44'/60'/0'/0/0)", sub: "POST /api/dmk/get-address", idx: 2 },
              { label: "Sign EIP-1559 Transaction (auto button press)", sub: "POST /api/dmk/sign-auto", idx: 3 },
            ].map((s) => {
              const status =
                stepIdx > s.idx ? "done" :
                stepIdx === s.idx ? "loading" : "pending";
              const isErr = dmk.step === "error" && stepIdx === s.idx;
              return (
                <div key={s.label} className="flex items-center gap-2.5 text-sm">
                  {isErr ? (
                    <ShieldX className="w-4 h-4 text-destructive shrink-0" />
                  ) : status === "done" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : status === "loading" ? (
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-stone-200 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-stone-700 font-medium">{s.label}</span>
                    <span className="text-stone-400 text-xs font-mono ml-2">{s.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Address */}
        {dmk.address && (
          <div className="bg-stone-50 rounded-lg p-3 border space-y-1">
            <div className="text-xs font-semibold text-stone-500 flex items-center gap-1">
              <Key className="w-3 h-3" /> Signer Address (Speculos device key)
            </div>
            <div className="font-mono text-xs text-stone-800 break-all">{dmk.address}</div>
          </div>
        )}

        {/* Signature result */}
        {dmk.step === "done" && dmk.sig && (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <PenLine className="w-3 h-3" /> Real ECDSA Signature (secp256k1)
              </div>
              <div className="space-y-0.5 font-mono text-xs break-all">
                <div><span className="text-stone-400">v: </span><span className="text-stone-800">{dmk.sig.v}</span></div>
                <div><span className="text-stone-400">r: </span><span className="text-stone-800">{dmk.sig.r}</span></div>
                <div><span className="text-stone-400">s: </span><span className="text-stone-800">{dmk.sig.s}</span></div>
              </div>
            </div>

            {dmk.screens.length > 0 && (
              <div className="bg-stone-50 rounded-lg p-3 border">
                <div className="text-xs font-semibold text-stone-500 mb-2">Speculos Screens Navigated</div>
                <div className="space-y-0.5">
                  {dmk.screens.map((s, i) => (
                    <div key={i} className="text-xs text-stone-600 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 text-stone-300 shrink-0" />
                      <span className="font-mono">{s.split("|").slice(-2).join(" › ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              Transaction passed SignScope firewall (verdict: {verdict}) before Speculos was called.
            </div>
          </div>
        )}

        {/* Error */}
        {dmk.step === "error" && dmk.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 font-mono">
            {dmk.error}
          </div>
        )}

        {/* Idle hint */}
        {dmk.step === "idle" && (
          <div className="text-xs text-stone-400 bg-stone-50 rounded-lg p-3 border space-y-1">
            <div className="font-semibold text-stone-500">How it works</div>
            <div>1. DMK connects to Speculos via <code className="bg-stone-100 px-1 rounded">speculosTransportFactory</code></div>
            <div>2. Derives Ethereum address at m/44'/60'/0'/0/0</div>
            <div>3. Sends EIP-1559 APDU → Speculos auto-approves (presses both buttons)</div>
            <div>4. Returns real secp256k1 ECDSA signature — same cryptography as mainnet</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// CLI output panel (for dry-run only)
// ---------------------------------------------------------------------------

function CliOutput({ result, error }: { result: WalletCliResult | null; error: string | null }) {
  if (!result && !error) {
    return (
      <div className="bg-black/90 text-stone-500 text-xs p-4 min-h-32 font-mono rounded-b-lg">
        No command run yet.
      </div>
    );
  }

  if (result?.skipped) {
    return (
      <div className="bg-amber-50 border-t border-amber-200 p-4 text-sm space-y-2 rounded-b-lg">
        <div className="font-semibold text-amber-800">Real CLI not enabled</div>
        <div className="text-amber-700">{result.skipReason}</div>
        <code className="block text-xs bg-amber-100 border border-amber-200 rounded p-2 font-mono">
          ENABLE_REAL_LEDGER_CLI=true
        </code>
        <div className="text-xs text-muted-foreground mt-1">
          Command that would have run: <code className="font-mono">{result.command}</code>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-3 py-2 bg-muted/30 border-t text-xs font-mono flex items-center gap-2 text-muted-foreground">
        <Terminal className="h-3 w-3" />
        <span className="flex-1 truncate">{result?.command ?? "—"}</span>
        {result?.exitCode != null && (
          <Badge variant={result.ok ? "outline" : "destructive"} className="text-xs">
            exit {result.exitCode}
          </Badge>
        )}
      </div>
      <pre className="bg-black/90 text-green-400 text-xs p-4 min-h-32 overflow-auto whitespace-pre-wrap rounded-b-lg">
        {error ?? (result ? (result.stdout || result.stderr || "(no output)") : "")}
      </pre>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function LedgerGate() {
  const { toast } = useToast();

  const [lastRun, setLastRun] = useState<RequestCheckResult | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [cliResult, setCliResult] = useState<WalletCliResult | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("signscope_last_run");
      if (stored) setLastRun(JSON.parse(stored) as RequestCheckResult);
    } catch { /* ignore */ }
    api.settings().then(setSettings).catch(() => null);
  }, []);

  const run = useCallback(async (label: string, action: () => Promise<WalletCliResult>) => {
    setRunning(label);
    setError(null);
    setCliResult(null);
    try {
      const res = await action();
      setCliResult(res);
      if (res.skipped) {
        toast({ title: "CLI not enabled", description: res.skipReason, variant: "destructive" });
      } else if (res.ok) {
        toast({ title: "✅ Command completed" });
      } else {
        toast({ title: "CLI error", description: res.stderr || res.error, variant: "destructive" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setRunning(null);
    }
  }, [toast]);

  if (!lastRun) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
        <div className="space-y-2 mb-6">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Fingerprint className="w-8 h-8 text-primary" />
            Ledger Gate
          </h1>
          <p className="text-muted-foreground">The final signing gate. Results come from a real pipeline run.</p>
        </div>
        <Card className="border-stone-200">
          <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
            <Fingerprint className="h-12 w-12 text-stone-300" />
            <div className="text-stone-600 font-medium">No pipeline run yet</div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Go to Request Check, select an invoice preset and click Run Check.
              The result will appear here.
            </p>
            <a href="/app/intent">
              <Button variant="outline" className="gap-2 mt-2">
                <ArrowLeft className="h-4 w-4" /> Go to Request Check
              </Button>
            </a>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const { verdict, agentTransaction, ledger, runId } = lastRun;
  const accountLabel = settings?.defaultAccountLabel ?? "ethereum-1";
  const isBlocked = verdict === "blocked";
  const canSign = ledger.eligibleForSigning && confirmation === CONFIRMATION;

  const verdictColor =
    verdict === "safe" ? "text-emerald-700" :
    verdict === "warning" ? "text-yellow-700" :
    "text-destructive";

  const verdictBg =
    verdict === "safe" ? "border-emerald-200 bg-emerald-50/50" :
    verdict === "warning" ? "border-yellow-200 bg-yellow-50/50" :
    "border-destructive/30 bg-destructive/5";

  const commandPreview = `wallet-cli send ${accountLabel} --to ${agentTransaction.to} --amount "${agentTransaction.amount} ${agentTransaction.asset}" --dry-run --format json`;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Fingerprint className="w-8 h-8 text-primary" />
          Ledger Gate
        </h1>
        <p className="text-muted-foreground">
          Final signing gate. Verdict and transaction from Gemini + SignScope diff.
        </p>
      </div>

      {/* Verdict + transaction summary */}
      <div className={`rounded-xl border-2 p-5 ${verdictBg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isBlocked
                ? <ShieldX className="h-6 w-6 text-destructive" />
                : <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
              <span className={`font-bold text-xl ${verdictColor}`}>
                {verdict === "safe" ? "Safe" : verdict === "warning" ? "Warning" : "Blocked"}
              </span>
              <Badge variant="outline" className="ml-2 text-xs font-mono">{runId.slice(0, 8)}…</Badge>
            </div>
            {isBlocked && (
              <div className="text-destructive/80 text-sm font-medium">
                🚫 Ledger signing NOT triggered. Transaction blocked by SignScope.
              </div>
            )}
          </div>
          <a href="/app/intent">
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <ArrowLeft className="h-3 w-3" /> New Run
            </Button>
          </a>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mt-4 font-mono text-sm">
          <div className="bg-white/60 rounded-lg p-3 border border-white/40">
            <div className="text-xs text-muted-foreground mb-1">TO</div>
            <div className="font-medium">{agentTransaction.recipientName ?? "Unknown"}</div>
            <div className="text-xs text-muted-foreground truncate" title={agentTransaction.to}>{agentTransaction.to}</div>
          </div>
          <div className="bg-white/60 rounded-lg p-3 border border-white/40">
            <div className="text-xs text-muted-foreground mb-1">AMOUNT</div>
            <div className="font-bold text-lg">{agentTransaction.amount} {agentTransaction.asset}</div>
            <div className="text-xs text-muted-foreground">{agentTransaction.chain}</div>
          </div>
          <div className="bg-white/60 rounded-lg p-3 border border-white/40">
            <div className="text-xs text-muted-foreground mb-1">SOURCE</div>
            <div className={`font-medium capitalize ${agentTransaction.sourceOfInstruction === "invoice" ? "text-destructive" : "text-emerald-700"}`}>
              {agentTransaction.sourceOfInstruction}
            </div>
            <div className="text-xs text-muted-foreground">invoice: {agentTransaction.invoiceId ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Device selector legend */}
      <div className="rounded-xl border bg-white p-4">
        <div className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-3">Signing Device Options</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {/* Speculos */}
          <div className="flex items-start gap-3 rounded-lg border-2 border-emerald-300 bg-emerald-50 p-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-semibold text-emerald-900 text-sm flex items-center gap-2">
                Speculos Emulator
                <span className="text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded">AVAILABLE</span>
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                Ledger Nano S+ software emulator. Real ECDSA cryptography — same signing as hardware. No USB required.
              </div>
              <div className="text-[10px] text-emerald-600 mt-1 font-mono">@ledgerhq/device-transport-kit-speculos · localhost:5000</div>
            </div>
          </div>
          {/* Real Ledger */}
          <div className="flex items-start gap-3 rounded-lg border-2 border-stone-200 bg-stone-50 p-3">
            <div className="w-8 h-8 rounded-lg bg-stone-600 flex items-center justify-center shrink-0 mt-0.5">
              <HardDrive className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-semibold text-stone-700 text-sm flex items-center gap-2">
                Ledger Hardware Device
                <span className="text-[9px] font-bold bg-stone-300 text-stone-700 px-1.5 py-0.5 rounded">USB REQUIRED</span>
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                Physical Ledger Nano X/S+ connected via USB. Requires <code className="bg-stone-100 px-0.5 rounded">ENABLE_REAL_LEDGER_CLI=true</code> + <code className="bg-stone-100 px-0.5 rounded">ENABLE_REAL_SIGNING=true</code> in .env.
              </div>
              <div className="text-[10px] text-stone-400 mt-1">wallet-cli · ENABLE_REAL_SIGNING=true</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger eligibility */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm">Ledger Eligibility</CardTitle>
          <CardDescription className="text-xs">{ledger.reason}</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex gap-6">
          <div className="flex items-center gap-2 text-sm">
            {ledger.eligibleForDryRun
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              : <ShieldX className="h-4 w-4 text-destructive" />}
            Dry-run
          </div>
          <div className="flex items-center gap-2 text-sm">
            {ledger.eligibleForDryRun
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              : <ShieldX className="h-4 w-4 text-destructive" />}
            <Cpu className="h-3.5 w-3.5 text-emerald-600" /> Speculos (DMK)
          </div>
          <div className="flex items-center gap-2 text-sm">
            {ledger.eligibleForSigning
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              : <ShieldX className="h-4 w-4 text-destructive" />}
            <HardDrive className="h-3.5 w-3.5 text-stone-400" /> Real Ledger
          </div>
        </CardContent>
      </Card>

      {/* Dry-run panel */}
      <Card className={`shadow-sm overflow-hidden ${isBlocked ? "opacity-60" : ""}`}>
        <CardHeader className="bg-muted/30 border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Dry-Run</CardTitle>
              <CardDescription className="text-xs mt-1 font-mono">{commandPreview}</CardDescription>
            </div>
            <Button
              disabled={!!running || isBlocked}
              onClick={() => run("dry-run", () => api.dryRunSend({
                verdict: verdict as Verdict,
                accountLabel,
                to: agentTransaction.to,
                amount: agentTransaction.amount,
                asset: agentTransaction.asset,
              }))}
            >
              {running === "dry-run"
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running…</>
                : "Run Dry-Run"}
            </Button>
          </div>
        </CardHeader>
        {isBlocked && (
          <div className="px-4 py-3 bg-destructive/5 border-b text-sm text-destructive flex items-center gap-2">
            <ShieldX className="h-4 w-4" />
            Blocked by SignScope. Ledger signing not triggered.
          </div>
        )}
        <CliOutput result={running === "dry-run" ? null : cliResult} error={error} />
      </Card>

      {/* ── Speculos DMK signing (inline) ── */}
      <SpeculosDmkCard verdict={verdict} isBlocked={isBlocked} />

      {/* ── Real Ledger Hardware signing ── */}
      <Card className={`shadow-sm overflow-hidden ${isBlocked ? "opacity-60" : ""}`}>
        <CardHeader className="bg-stone-50 border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stone-700 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base text-stone-800 flex items-center gap-2">
                Ledger Hardware Device Signing
                <span className="text-[9px] font-bold bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded">USB ONLY</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Requires a physical Ledger Nano X or S+ connected via USB and <code className="bg-stone-100 px-0.5 rounded">ENABLE_REAL_SIGNING=true</code> in .env
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4 pb-4">
          {/* Device requirement notice */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <div className="font-semibold">Physical Ledger device required</div>
              <div>This option sends a real APDU to a USB-connected Ledger. The device will show the transaction on its screen and require manual button confirmation.</div>
              <div className="font-mono bg-amber-100 rounded px-2 py-1 text-[10px] space-y-0.5">
                <div>ENABLE_REAL_LEDGER_CLI=true   # in .env</div>
                <div>ENABLE_REAL_SIGNING=true       # in .env</div>
                <div>Connect Ledger via USB + unlock + open Ethereum app</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500 bg-stone-50 rounded-lg border p-3">
            <Usb className="h-3.5 w-3.5 shrink-0" />
            <span>For demo purposes, use <strong>Speculos (DMK)</strong> above — same cryptography, no USB required.</span>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Type to confirm:</Label>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRMATION}
              className="font-mono text-xs"
              disabled={!!running || isBlocked}
            />
            <p className="text-xs text-muted-foreground">
              Type exactly: <code className="bg-muted px-1 rounded">{CONFIRMATION}</code>
            </p>
          </div>
          <Button
            variant="destructive"
            className="w-full"
            disabled={!!running || !canSign || isBlocked}
            onClick={() => run("sign", () => api.signSend({
              verdict: verdict as Verdict,
              accountLabel,
              to: agentTransaction.to,
              amount: agentTransaction.amount,
              asset: agentTransaction.asset,
              confirmation,
            }))}
          >
            {running === "sign"
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Requesting Ledger signing…</>
              : <><HardDrive className="h-4 w-4 mr-2" /> Request Hardware Ledger Signing</>}
          </Button>

          {!ledger.eligibleForSigning && !isBlocked && (
            <div className="text-xs text-muted-foreground bg-muted/40 border rounded p-3 space-y-1">
              <div className="font-semibold">To enable real hardware signing:</div>
              <div>1. Set <code className="bg-muted px-1 rounded">ENABLE_REAL_LEDGER_CLI=true</code> in .env</div>
              <div>2. Set <code className="bg-muted px-1 rounded">ENABLE_REAL_SIGNING=true</code> in .env</div>
              <div>3. Connect a Ledger Nano X/S+ via USB, unlock, open Ethereum app</div>
              <div>4. Restart the server</div>
              <div className="pt-1">
                <a href="https://github.com/LedgerHQ/speculos" target="_blank" rel="noopener noreferrer"
                  className="underline inline-flex items-center gap-0.5 text-blue-600">
                  Speculos docs <ExternalLink className="h-2.5 w-2.5" />
                </a>
                <span className="mx-2">·</span>
                <a href="https://www.ledger.com" target="_blank" rel="noopener noreferrer"
                  className="underline inline-flex items-center gap-0.5 text-blue-600">
                  Buy Ledger <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          )}
        </CardContent>
        {(running === "sign" || (!running && cliResult && running !== "dry-run")) && (
          <CliOutput result={cliResult} error={error} />
        )}
      </Card>
    </motion.div>
  );
}
