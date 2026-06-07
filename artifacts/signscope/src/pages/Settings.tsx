import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, Shield, Server, Coins } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { shortAddress } from "@/lib/format";
import type { Settings as SettingsType } from "@/lib/types";

export default function Settings() {
  const [settings, setSettings] = useState<SettingsType | null>(null);

  useEffect(() => {
    api.settings().then(setSettings).catch(() => setSettings(null));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Firewall Configuration
        </h1>
        <p className="text-muted-foreground">Security policies, allowlists, and Ledger integration defaults.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-secondary" />
              <CardTitle>Policy Rules</CardTitle>
            </div>
            <CardDescription>Backend-enforced comparison rules</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            {settings && Object.entries(settings.policies).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label className="text-sm font-semibold">{key}</Label>
                {typeof value === "boolean" ? <Switch checked={value} disabled /> : <Input value={String(value)} readOnly className="w-28 font-mono" />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              <CardTitle>Supported Assets</CardTitle>
            </div>
            <CardDescription>Diff engine support for this MVP</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {settings?.supportedAssets.map((asset) => <Badge key={asset} variant="outline" className="px-3 py-1 font-mono">{asset}</Badge>)}
            </div>
            <p className="text-sm text-muted-foreground pt-2 border-t">
              Native ETH is supported for local Wallet CLI proof mode. ERC-20/USDC signing depends on current Wallet CLI token-send support.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm md:col-span-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-accent" />
              <CardTitle>Ledger Integration</CardTitle>
            </div>
            <CardDescription>Values reflect backend environment variables.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border">
              <div>
                <Label className="text-base font-semibold text-primary">Simulation Mode</Label>
                <p className="text-xs text-muted-foreground">Default is true.</p>
              </div>
              <Switch checked={settings?.simulationMode ?? true} disabled />
            </div>
            <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border">
              <div>
                <Label className="text-base font-semibold text-destructive">Real Signing Enabled</Label>
                <p className="text-xs text-muted-foreground">Requires ENABLE_REAL_SIGNING=true.</p>
              </div>
              <Switch checked={settings?.enableRealSigning ?? false} disabled />
            </div>
            <div className="space-y-2">
              <Label>Wallet CLI binary path</Label>
              <Input value={settings?.walletCliBin ?? "wallet-cli"} readOnly className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Default account label</Label>
              <Input value={settings?.defaultAccountLabel ?? "ethereum-1"} readOnly className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Default network</Label>
              <Input value={settings?.defaultNetwork ?? "ethereum"} readOnly className="font-mono" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm md:col-span-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle>Allowlisted Recipients</CardTitle>
            <CardDescription>Known names and addresses used by comparison rules.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {settings?.allowlistedRecipients.map((recipient) => (
                <div key={recipient.address} className="flex justify-between items-center p-3 border rounded-lg bg-card gap-4">
                  <span className="font-semibold text-sm">{recipient.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{shortAddress(recipient.address)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
