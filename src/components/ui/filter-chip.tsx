"use client";

import { cn } from "@/lib/cn";

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: string;
  variant?: "default" | "warning";
}

export function FilterChip({ label, active, onClick, icon, variant = "default" }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
        active
          ? variant === "warning"
            ? "border-red-300 bg-red-50 text-red-700"
            : "border-blue-300 bg-blue-50 text-blue-700"
          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50",
      )}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}
