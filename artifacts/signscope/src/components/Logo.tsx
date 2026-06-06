import { Link } from 'wouter';
import { ShieldCheck } from 'lucide-react';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <div className="bg-accent text-accent-foreground p-1.5 rounded-lg flex items-center justify-center">
        <ShieldCheck className="w-5 h-5" />
      </div>
      <div className="text-xl leading-none">
        <span className="text-accent">Sign</span>
        <span className="text-primary">Scope</span>
      </div>
    </Link>
  );
}
