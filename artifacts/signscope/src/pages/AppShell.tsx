import { Link, useLocation } from "wouter";
import { Logo } from "@/components/Logo";
import { 
  LayoutDashboard, 
  MessageSquare, 
  ShieldAlert, 
  ArrowLeftRight, 
  Fingerprint, 
  ListChecks, 
  Settings,
  LogOut,
  ChevronRight
} from "lucide-react";
import { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/intent", label: "Intent Lab", icon: MessageSquare },
  { href: "/app/invoice", label: "Invoice Attack Lab", icon: ShieldAlert },
  { href: "/app/diff", label: "Transaction Diff", icon: ArrowLeftRight },
  { href: "/app/ledger", label: "Ledger Gate", icon: Fingerprint },
  { href: "/app/audit", label: "Audit Logs", icon: ListChecks },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const currentNav = NAV_ITEMS.find(n => n.href === location) || NAV_ITEMS[0];

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="p-6">
          <Logo className="text-sidebar-foreground [&_.text-accent]:text-white [&_.text-primary]:text-sidebar-primary [&_.bg-accent]:bg-white/10" />
        </div>
        
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60"}`} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border mt-auto">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent cursor-pointer transition-colors">
            <LogOut className="w-5 h-5 text-sidebar-foreground/60" />
            Exit Demo
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Topbar */}
        <header className="h-16 border-b bg-card/50 backdrop-blur flex items-center px-6 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>SignScope</span>
            <ChevronRight className="w-4 h-4" />
            <span className="font-semibold text-foreground">{currentNav.label}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
