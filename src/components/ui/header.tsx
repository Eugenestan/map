"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { FeedbackHeaderButton } from "@/components/features/feedback/feedback-widget";

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <defs>
        <linearGradient id="tg-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#37AEE2" />
          <stop offset="100%" stopColor="#1E96C8" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill="url(#tg-bg)" />
      <path
        fill="#FFFFFF"
        d="M5.49 11.62l11.94-4.6c.55-.2 1.03.13.85.96l-2.03 9.58c-.15.7-.57.87-1.15.54l-3.18-2.34-1.53 1.48c-.17.17-.31.31-.64.31l.23-3.24 5.9-5.33c.26-.23-.06-.36-.4-.13L7.99 12.48l-3.14-.98c-.68-.21-.7-.68.16-.99z"
      />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <defs>
        <radialGradient id="ig-bg" cx="0.3" cy="1" r="1">
          <stop offset="0%" stopColor="#FED576" />
          <stop offset="25%" stopColor="#F47133" />
          <stop offset="50%" stopColor="#BC3081" />
          <stop offset="75%" stopColor="#4C68D7" />
          <stop offset="100%" stopColor="#4C68D7" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6" ry="6" fill="url(#ig-bg)" />
      <rect
        x="4.5"
        y="4.5"
        width="15"
        height="15"
        rx="4.25"
        ry="4.25"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3.6" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
      <circle cx="17" cy="7" r="1.05" fill="#FFFFFF" />
    </svg>
  );
}

const SOCIAL_LINK_CLASS =
  "rounded-full p-1.5 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2";

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
        <div className="flex items-center gap-1">
          <a
            href="https://t.me/RussianMapNhaTrang"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Телеграм: Нячанг. Русская карта"
            title="Телеграм: Нячанг. Русская карта"
            className={SOCIAL_LINK_CLASS}
          >
            <TelegramIcon className="h-6 w-6" />
          </a>
          <a
            href="https://www.instagram.com/vietradar"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram: @vietradar"
            title="Instagram: @vietradar"
            className={SOCIAL_LINK_CLASS}
          >
            <InstagramIcon className="h-6 w-6" />
          </a>
          <FeedbackHeaderButton />
        </div>
      </div>
    </header>
  );
}
