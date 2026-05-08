"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { FeedbackHeaderButton } from "@/components/features/feedback/feedback-widget";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-14 items-center justify-between gap-2 px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <MapPin className="h-6 w-6 shrink-0 text-blue-600" />
            <span className="truncate text-lg font-bold text-zinc-900">Русская карта Нячанга</span>
          </Link>
          <Link href="/articles" className="hidden text-sm font-medium text-zinc-600 hover:text-blue-600 sm:inline">
            Интересные места
          </Link>
        </div>
        <FeedbackHeaderButton />
      </div>
    </header>
  );
}
