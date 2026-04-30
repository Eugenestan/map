import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@/components/ui/analytics";
import { FeedbackWidget } from "@/components/features/feedback/feedback-widget";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nhatrang.guide";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Русская карта Нячанга — полезные места для русскоязычных",
    template: "%s | Нячанг для русских",
  },
  description:
    "Интерактивная карта Нячанга для русскоязычных туристов и экспатов. Русские врачи, аптеки, кафе с русским меню, обменники, гиды, салоны красоты и другие сервисы.",
  keywords: [
    "Нячанг",
    "Nha Trang",
    "Вьетнам",
    "карта Нячанга",
    "русский врач Нячанг",
    "русские в Нячанге",
    "русская кухня Нячанг",
    "обмен валюты Нячанг",
    "гид Нячанг",
    "экскурсии Нячанг",
  ],
  authors: [{ name: "Русская карта Нячанга" }],
  creator: "Русская карта Нячанга",
  openGraph: {
    title: "Русская карта Нячанга — полезные места для русскоязычных",
    description:
      "Интерактивная карта Нячанга для русскоязычных туристов и экспатов: врачи, кафе, обменники, гиды и многое другое.",
    url: siteUrl,
    siteName: "Нячанг для русских",
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Русская карта Нячанга",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Русская карта Нячанга",
    description: "Полезные места для русскоязычных в Нячанге, Вьетнам",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} h-full`}>
      <body className="h-full font-sans antialiased">
        {children}
        <FeedbackWidget />
        <Analytics />
      </body>
    </html>
  );
}
