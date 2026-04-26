import { cn } from "@/lib/cn";
import type { TagType } from "@/types";

interface TagBadgeProps {
  label: string;
  type?: TagType;
  size?: "sm" | "md";
}

const TYPE_STYLES: Record<TagType, string> = {
  language: "bg-blue-50 text-blue-700 border-blue-200",
  useful: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-red-50 text-red-700 border-red-200",
  service: "bg-purple-50 text-purple-700 border-purple-200",
  food: "bg-amber-50 text-amber-700 border-amber-200",
};

export function TagBadge({ label, type = "useful", size = "sm" }: TagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        TYPE_STYLES[type],
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
    >
      {label}
    </span>
  );
}
