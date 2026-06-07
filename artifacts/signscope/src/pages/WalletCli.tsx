import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Terminal, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Settings, WalletCliResult } from "@/lib/types";

export default function WalletCli() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [accountLabel, setAccountLabel] = useState("ethereum-1");
  const [result, setResult] = useState<WalletCliResult | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedOut, setCopiedOut] = useState(false);

  useEffect(() => {
    api
      .settings()
      .then((value) => {
        setSettings(value);
        setAccountLabel(value.defaultAccountLabel);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const run = async (label: string, action: () => Promise<WalletCliResult>) => {
    setRunning(label);
    setError(null);
    try {
      const res = await action();
      setResult(res);
      if (!res.ok) {
        toast({
          title: `${label}: command failed`,
          description: res.stderr || res.error || "Non-zero exit code",
          variant: "destructive",
        });
      } else {
        toast({ title: `${label}: done`, description: res.skipped ? "Simulation mode — command skipped." : "OK" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast({ title: `${label}: error`, description: msg, variant: "destructive" });
    } finally {
      setRunning(null);
    }
  };

  const copyText = async (text: string, which: "cmd" | "out") => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === "cmd") {
        setCopiedCmd(true);
        setTimeout(() => setCopiedCmd(false), 1500);
      } else {
        setCopiedOut(true);
        setTimeout(() => setCopiedOut(false), 1500);
      }
    } catch {
      // silent
    }
  };

  const outputText = (r: WalletCliResult | null): string => {
    if (!r) return "No command run yet.\nClick a button above to run a wallet-cli diagnostic.";
    const parts: string[] = [];
    if (r.skipped) parts.push("⚡ SIMULATION MODE — real wallet-cli command was NOT executed.\n");
    if (r.stdout) parts.push(`--- stdout ---\n${r.stdout}`);
    if (r.stderr) parts.push(`--- stderr ---\n${r.stderr}`);
    if (r.error) parts.push(`--- error ---\n${r.error}`);
    if (r.exitCode !== null) parts.push(`\n--- exit code: ${r.exitCode} ---`);
    return parts.join("\n") || "(no output)";
  };

  const CLI_BUTTONS: { id: string; label: string; action: () => Promise<WalletCliResult>; cols?: number }[] = [
    { id: "version", label: "Check CLI version", action: api.walletVersion },
    { id: "genuine", label: "Run genuine-check", action: api.genuineCheck },
    { id: "discover-eth", label: "Discover Ethereum accounts", action: () => api.discover("ethereum") },
    { id: "discover-sol", label: "Discover Solana accounts", action: () => api.discover("solana") },
    { id: "session-view", label: "Show session", action: api.sessionView },
    { id: "session-reset", label: "Reset session", action: api.sessionReset },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-6xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Terminal className="w-8 h-8 text-primary" />
          Wallet CLI Diagnostics
        </h1>
        <p className="text-muted-foreground">
          Run predefined Ledger Wallet CLI commands through the local backend wrapper.
          No arbitrary commands are accepted from the frontend.
        </p>
      </div>

      {/* Config card */}
      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle>Current Configuration</CardTitle>
          <CardDescription>
            Values from backend settings. Set SIMULATION_MODE=false and ENABLE_REAL_SIGNING=true in .env to enable real wallet-cli.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid md:grid-cols-4 gap-4">
          <div>
            <Label>Mode</Label>
            <div className="mt-2">
              <Badge variant={settings?.simulationMode ? "outline" : "destructive"}>
                {settings?.simulationMode ? "Simulation" : "Real Wallet CLI"}
              </Badge>
            </div>
          </div>
          <div>
            <Label>Wallet CLI binary</Label>
            <Input value={settings?.walletCliBin ?? "wallet-cli"} readOnly className="mt-2 font-mono" />
          </div>
          <div>
            <Label>Real signing</Label>
            <Input
              value={settings?.enableRealSigning ? "ENABLED" : "disabled"}
              readOnly
              className={`mt-2 font-mono ${settings?.enableRealSigning ? "text-destructive font-bold" : ""}`}
            />
          </div>
          <div>
            <Label>Balance account label</Label>
            <Input
              id="wallet-account-label"
              value={accountLabel}
              onChange={(e) => setAccountLabel(e.target.value)}
              className="mt-2 font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <div className="grid md:grid-cols-3 gap-3">
        {CLI_BUTTONS.map((btn) => (
          <Button
            key={btn.id}
            id={`wallet-btn-${btn.id}`}
            variant="outline"
            disabled={!!running}
            onClick={() => run(btn.label, btn.action)}
          >
            {running === btn.label ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {btn.label}
          </Button>
        ))}
        <Button
          id="wallet-btn-balances"
          className="md:col-span-3"
          disabled={!!running}
          onClick={() => run("Get balances", () => api.balances(accountLabel))}
        >
          {running === "Get balances" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Get balances for "{accountLabel}"
        </Button>
      </div>

      {/* Output */}
      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Last Command Output</CardTitle>
              <CardDescription>Exact stdout, stderr, exit code, and errors shown.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => result?.command && copyText(result.command, "cmd")}
                disabled={!result?.command}
                id="wallet-copy-cmd-btn"
              >
                {copiedCmd ? <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1" />}
                Copy command
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => result && copyText(outputText(result), "out")}
                disabled={!result}
                id="wallet-copy-output-btn"
              >
                {copiedOut ? <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1" />}
                Copy output
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 border-b text-sm font-mono bg-muted/20 flex items-center justify-between gap-2">
            <span className="truncate">{result?.command ?? "No command run yet."}</span>
            {result?.exitCode !== null && result?.exitCode !== undefined && (
              <Badge variant={result.exitCode === 0 ? "outline" : "destructive"} className="shrink-0">
                exit {result.exitCode}
              </Badge>
            )}
          </div>
          <pre className="bg-black text-green-400 text-xs p-4 min-h-64 overflow-auto whitespace-pre-wrap">
            {outputText(result)}
          </pre>
          {error && (
            <div className="p-4 text-sm text-destructive bg-destructive/10 border-t">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
