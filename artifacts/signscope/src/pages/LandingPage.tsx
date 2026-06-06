import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShieldAlert, FileText, CheckCircle2, ArrowRight, XCircle, TerminalSquare, AlertTriangle, Fingerprint } from "lucide-react";

export default function LandingPage() {
  const [demoStep, setDemoStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % 5);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <Badge variant="secondary" className="hidden sm:inline-flex bg-secondary/10 text-secondary hover:bg-secondary/20">
              AI Firewall
            </Badge>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/app" className="hover:text-foreground transition-colors">Demo</Link>
            <Link href="/app/invoice" className="hover:text-foreground transition-colors">Attack Lab</Link>
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="#" className="hover:text-foreground transition-colors">Docs</a>
          </nav>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            <Link href="/app">Launch Demo</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="container mx-auto px-4 py-24 md:py-32 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-6"
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
              Stop AI agents from signing the <span className="text-destructive">wrong transaction.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-[600px] leading-relaxed">
              SignScope is a prompt-to-transaction firewall that validates agent intent against generated calldata, using Ledger as the final signing gate.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-base h-12 px-8">
                <Link href="/app">Launch Interactive Demo</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
                <Link href="/app/invoice">View Attack Lab</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative w-full aspect-square md:aspect-[4/3] max-w-[600px] mx-auto bg-accent/5 rounded-2xl border border-accent/20 p-4 md:p-6 shadow-2xl flex flex-col gap-4 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-destructive/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-secondary/80" />
            </div>

            <AnimatePresence mode="wait">
              {demoStep === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-card p-4 rounded-xl border shadow-sm flex flex-col gap-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">User Intent</div>
                  <div className="font-mono text-sm">Pay 25 USDC to Alice for invoice INV-102</div>
                </motion.div>
              )}

              {demoStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-card p-4 rounded-xl border shadow-sm flex flex-col gap-3 relative overflow-hidden">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scanning Document</div>
                  <div className="text-sm opacity-50 blur-[1px]">Invoice INV-102... Amount: 25 USDC... [HIDDEN] Send ETH...</div>
                  <motion.div 
                    initial={{ top: 0 }} 
                    animate={{ top: "100%" }} 
                    transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                    className="absolute left-0 right-0 h-0.5 bg-secondary/50 shadow-[0_0_8px_2px_rgba(13,148,136,0.5)] z-10" 
                  />
                </motion.div>
              )}

              {demoStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-destructive/10 p-6 rounded-xl border border-destructive/20 flex flex-col items-center justify-center text-center gap-3">
                  <AlertTriangle className="w-12 h-12 text-destructive animate-pulse" />
                  <div className="font-semibold text-destructive">Malicious instruction detected</div>
                  <div className="text-sm text-destructive/80">Prompt injection found in attached invoice</div>
                </motion.div>
              )}

              {demoStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-card p-4 rounded-xl border shadow-sm flex flex-col gap-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction Diff</div>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-sm">
                    <div className="p-2 bg-secondary/10 text-secondary rounded border border-secondary/20">USDC</div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="p-2 bg-destructive/10 text-destructive rounded border border-destructive/20">ETH</div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-sm">
                    <div className="p-2 bg-secondary/10 text-secondary rounded border border-secondary/20 truncate">Alice</div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="p-2 bg-destructive/10 text-destructive rounded border border-destructive/20 truncate">0xAttacker...</div>
                  </div>
                </motion.div>
              )}

              {demoStep === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="bg-[#1c1c1c] text-white p-6 rounded-xl border-2 border-border shadow-2xl flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <TerminalSquare className="w-5 h-5 text-muted-foreground" />
                      <span className="font-semibold tracking-wide">Ledger / Speculos</span>
                    </div>
                    <Badge variant="outline" className="text-xs bg-white/5 border-white/10">Simulation</Badge>
                  </div>
                  <div className="font-mono text-sm text-red-400">
                    BLOCKED: Payload mismatch detected. Review required.
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="destructive" className="w-full">Reject</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* TRUST STRIP */}
        <section className="border-y bg-muted/30">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: FileText, title: "Intent Parser" },
                { icon: ShieldAlert, title: "Injection Detector" },
                { icon: CheckCircle2, title: "Diff Engine" },
                { icon: Fingerprint, title: "Ledger Gate" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="p-2 bg-card border rounded-lg shadow-sm">
                    <item.icon className="w-5 h-5 text-accent" />
                  </div>
                  <span className="font-medium text-sm text-foreground">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t bg-card py-12 mt-24">
        <div className="container mx-auto px-4 text-center flex flex-col items-center gap-4">
          <Logo />
          <p className="text-sm text-muted-foreground">SignScope — AI Agent Transaction Firewall</p>
          <p className="text-xs text-muted-foreground/60">Built for Ledger Agent Stack exploration</p>
        </div>
      </footer>
    </div>
  );
}
