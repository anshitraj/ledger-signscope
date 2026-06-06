import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, Shield, Server, Coins } from "lucide-react";
import { motion } from "framer-motion";

export default function Settings() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-4xl pb-12"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Firewall Configuration
        </h1>
        <p className="text-muted-foreground">
          Manage security policies, allowlists, and Ledger integration settings.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-secondary" />
              <CardTitle>Policy Limits</CardTitle>
            </div>
            <CardDescription>Global security enforcement rules</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Strict Intent Matching</Label>
                <p className="text-sm text-muted-foreground">Block if intent parser confidence &lt; 90%</p>
              </div>
              <Switch checked={true} disabled />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Document Scan Enforcement</Label>
                <p className="text-sm text-muted-foreground">Block if prompt injection detected</p>
              </div>
              <Switch checked={true} disabled />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Address Allowlisting</Label>
                <p className="text-sm text-muted-foreground">Only allow sending to known entities</p>
              </div>
              <Switch checked={true} disabled />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              <CardTitle>Supported Assets</CardTitle>
            </div>
            <CardDescription>Monitored tokens and networks</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="px-3 py-1 font-mono">USDC (Ethereum)</Badge>
                <Badge variant="outline" className="px-3 py-1 font-mono">USDC (Base)</Badge>
                <Badge variant="outline" className="px-3 py-1 font-mono">ETH (Ethereum)</Badge>
                <Badge variant="outline" className="px-3 py-1 font-mono">USDT (Ethereum)</Badge>
              </div>
              <p className="text-sm text-muted-foreground pt-2 border-t">
                Adding new assets requires an update to the intent parser schema.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm md:col-span-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-accent" />
              <CardTitle>Ledger Integration</CardTitle>
            </div>
            <CardDescription>Wallet CLI and Speculos configuration</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold text-primary">Simulation Mode</Label>
                  <p className="text-xs text-muted-foreground">Use mock Ledger instead of real device</p>
                </div>
                <Switch checked={true} disabled />
              </div>
              
              <div className="space-y-2">
                <Label>Wallet CLI Path</Label>
                <Input value="/usr/local/bin/ledger-wallet-cli" readOnly className="font-mono text-sm bg-muted/20 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Speculos App Path</Label>
                <Input value="./bin/app.elf" readOnly className="font-mono text-sm bg-muted/20 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Speculos Host</Label>
                <Input value="127.0.0.1:5000" readOnly className="font-mono text-sm bg-muted/20 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm md:col-span-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle>Allowlisted Entities</CardTitle>
            <CardDescription>Known addresses mapped to intent names</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex justify-between items-center p-3 border rounded-lg bg-card">
                <span className="font-semibold text-sm">Alice</span>
                <span className="font-mono text-xs text-muted-foreground">0xA11CE000...</span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg bg-card">
                <span className="font-semibold text-sm">Bob</span>
                <span className="font-mono text-xs text-muted-foreground">0xB0B00000...</span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg bg-card">
                <span className="font-semibold text-sm">Treasury</span>
                <span className="font-mono text-xs text-muted-foreground">0x7EA5E8...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
