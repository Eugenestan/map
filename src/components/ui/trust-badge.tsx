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
    <div className="space-y-1">
      <span
        className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", trust.color)}
        title={trust.hint || undefined}
      >
        <Icon className="h-3.5 w-3.5" />
        {trust.label}
      </span>
      {trust.hint ? (
        <p className="text-xs text-zinc-500 leading-snug max-w-md">{trust.hint}</p>
      ) : null}
    </div>
  );
}
