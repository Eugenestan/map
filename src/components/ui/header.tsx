"use client";

import Link from "next/link";
import { MapPin, Shield } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold text-zinc-900">Русская карта Нячанга</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Модерация</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
