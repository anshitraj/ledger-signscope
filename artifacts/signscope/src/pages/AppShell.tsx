import { Link, useLocation } from "wouter";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard,
  FileSearch,
  ShieldAlert,
  ArrowLeftRight,
  Fingerprint,
  Terminal,
  ListChecks,
  Settings,
  Bell,
  ChevronRight,
  Sparkles,
  ChevronDown,
  FlaskConical,
  Cpu,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { api } from "@/lib/api";

const MAIN_NAV = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/intent", label: "Request Check", icon: FileSearch, badge: "main" },
  { href: "/app/ledger", label: "Ledger Gate", icon: Fingerprint },
  { href: "/app/wallet-cli", label: "Wallet CLI", icon: Terminal },
  { href: "/app/dmk", label: "Speculos DMK", icon: Cpu, badge: "dmk" },
  { href: "/app/audit", label: "Audit Logs", icon: ListChecks },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const DEV_SANDBOX_NAV = [
  { href: "/app/invoice", label: "Invoice Attack Lab", icon: ShieldAlert },
  { href: "/app/diff", label: "Transaction Diff", icon: ArrowLeftRight },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [geminiEnabled, setGeminiEnabled] = useState<boolean | null>(null);
  const [realCliEnabled, setRealCliEnabled] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);

  useEffect(() => {
    api.aiStatus()
      .then((s) => setGeminiEnabled(s.configured))
      .catch(() => setGeminiEnabled(false));
    api.settings()
      .then((s) => setRealCliEnabled(s.enableRealLedgerCli ?? false))
      .catch(() => null);
  }, []);

  const allNavItems = [...MAIN_NAV, ...DEV_SANDBOX_NAV];
  const currentNav = allNavItems.find((n) => n.href === location) ?? MAIN_NAV[0];

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex w-[232px] bg-[#064E3B] text-white flex-col">
        <div className="p-5">
          <Logo className="text-sidebar-foreground [&_.text-accent]:text-white [&_.text-primary]:text-sidebar-primary [&_.bg-accent]:bg-white/10" />
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {/* Main nav */}
          {MAIN_NAV.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#F97F06] text-white shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {(item as { badge?: string }).badge === "main" && (
                    <span className="text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded">
                      MAIN
                    </span>
                  )}
                  {(item as { badge?: string }).badge === "dmk" && (
                    <span className="text-[9px] font-bold bg-emerald-400/30 text-emerald-200 px-1.5 py-0.5 rounded">
                      DMK
                    </span>
                  )}
                </div>
              </Link>
            );
          })}

          {/* Dev Sandbox group */}
          <div className="pt-2">
            <button
              onClick={() => setSandboxOpen((o) => !o)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold text-white/50 hover:text-white/70 transition-colors uppercase tracking-wide"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Dev Sandbox</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sandboxOpen ? "rotate-180" : ""}`} />
            </button>
            {sandboxOpen && DEV_SANDBOX_NAV.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 ml-2 rounded-md text-sm font-medium transition-colors cursor-pointer border-l border-white/10 ${
                      isActive
                        ? "bg-white/15 text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 mt-auto space-y-2">
          {/* Gemini status */}
          <div className="rounded-md border border-white/15 bg-white/8 p-2.5 text-xs flex items-center gap-2">
            <Sparkles className="h-3 w-3 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Gemini AI</span>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              geminiEnabled === null ? "bg-white/20 text-white" :
              geminiEnabled ? "bg-teal-400 text-emerald-950" : "bg-red-400 text-red-950"
            }`}>
              {geminiEnabled === null ? "…" : geminiEnabled ? "ON" : "OFF"}
            </span>
          </div>
          {/* CLI status */}
          <div className="rounded-md border border-white/15 bg-white/8 p-2.5 text-xs flex items-center gap-2">
            <Terminal className="h-3 w-3 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Wallet CLI</span>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              realCliEnabled ? "bg-orange-400 text-orange-950" : "bg-white/20 text-white"
            }`}>
              {realCliEnabled ? "REAL" : "SIM"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <header className="h-16 border-b bg-white flex items-center justify-between px-5 lg:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <span>SignScope</span>
            <ChevronRight className="w-4 h-4" />
            <span className="font-semibold text-stone-900">{currentNav.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {geminiEnabled !== null && (
              <div
                className={`hidden sm:flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                  geminiEnabled
                    ? "border-purple-200 bg-purple-50 text-purple-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                {geminiEnabled ? "Gemini AI" : "No API key"}
              </div>
            )}
            <button className="grid h-9 w-9 place-items-center rounded-md border bg-white text-stone-600">
              <Bell className="h-4 w-4" />
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#065F46] text-sm font-bold text-white">
              S
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto w-full h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
