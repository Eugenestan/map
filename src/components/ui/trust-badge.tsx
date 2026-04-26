import { cn } from "@/lib/cn";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import type { TrustInfo } from "@/types";

interface TrustBadgeProps {
  trust: TrustInfo;
}

const ICONS = {
  fresh: ShieldCheck,
  stale: ShieldAlert,
  disputed: AlertTriangle,
};

export function TrustBadge({ trust }: TrustBadgeProps) {
  const Icon = ICONS[trust.level];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", trust.color)}>
      <Icon className="h-3.5 w-3.5" />
      {trust.label}
    </span>
  );
}
