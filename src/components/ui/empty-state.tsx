import { MapPin, Search, MessageSquare } from "lucide-react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  type?: "no-places" | "no-results" | "no-reviews";
  className?: string;
  onAction?: () => void;
}

const CONFIG = {
  "no-places": {
    icon: MapPin,
    title: "Мест пока нет",
    description: "В этом районе ещё нет отмеченных мест. Станьте первым!",
    action: "Добавить первое место",
  },
  "no-results": {
    icon: Search,
    title: "Ничего не найдено",
    description: "Попробуйте изменить запрос или сбросить фильтры.",
    action: undefined,
  },
  "no-reviews": {
    icon: MessageSquare,
    title: "Отзывов пока нет",
    description: "Будьте первым, кто оставит отзыв об этом месте!",
    action: "Оставить первый отзыв",
  },
};

export function EmptyState({ type = "no-places", className, onAction }: EmptyStateProps) {
  const config = CONFIG[type];
  const Icon = config.icon;

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <div className="mb-4 rounded-full bg-zinc-100 p-4">
        <Icon className="h-8 w-8 text-zinc-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900">{config.title}</h3>
      <p className="mt-1 text-sm text-zinc-500 max-w-xs">{config.description}</p>
      {config.action && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {config.action}
        </button>
      )}
    </div>
  );
}
