import { Badge } from "@/components/ui/badge";

type StatusType = "safe" | "warning" | "blocked" | "approved" | "rejected" | "pending" | "not_triggered" | "pass" | "fail" | "risky";

export function StatusBadge({ status, className = "" }: { status: StatusType | string, className?: string }) {
  const getVariants = (s: string) => {
    switch (s.toLowerCase()) {
      case "safe":
      case "approved":
      case "pass":
        return "bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20";
      case "warning":
      case "risky":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20";
      case "blocked":
      case "rejected":
      case "fail":
        return "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20";
      case "pending":
      case "not_triggered":
        return "bg-muted text-muted-foreground border-border hover:bg-muted/80";
      default:
        return "bg-muted text-muted-foreground border-border hover:bg-muted/80";
    }
  };

  const getLabel = (s: string) => {
    return s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Badge variant="outline" className={`font-medium ${getVariants(status)} ${className}`}>
      {getLabel(status)}
    </Badge>
  );
}
