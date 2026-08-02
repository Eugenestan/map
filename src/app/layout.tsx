import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@/components/ui/analytics";
import { JsonLd } from "@/components/ui/json-ld";
import { VisitTracker } from "@/components/ui/visit-tracker";
import { FeedbackProvider, FeedbackFab } from "@/components/features/feedback/feedback-widget";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Нячанг для русских",
  },
  description: SITE_DESCRIPTION,
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
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
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
    canonical: SITE_URL,
  },
  verification: {
    google: "4viTyr-h5ovynaAE_BVPZbLl8uSED4Ia9Bg0u94seDY",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/** Чтобы `env(safe-area-inset-*)` на iPhone / PWA отдавал корректные отступы у нижних FAB. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} h-full`}>
      <body className="h-full font-sans antialiased">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            alternateName: "VietRadar",
            url: SITE_URL,
            inLanguage: "ru",
            description: SITE_DESCRIPTION,
            potentialAction: {
              "@type": "SearchAction",
              target: `${SITE_URL}/?search={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }}
        />
        <FeedbackProvider>
          {children}
          <FeedbackFab />
        </FeedbackProvider>
        <VisitTracker />
        <Analytics />
      </body>
    </html>
  );
}
