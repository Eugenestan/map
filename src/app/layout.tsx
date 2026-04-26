import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Русская карта Нячанга",
  description: "Полезные места для русскоязычных в Нячанге, Вьетнам. Русские врачи, кафе, гиды, обменники и другие сервисы.",
  keywords: ["Нячанг", "Вьетнам", "карта", "русские", "русский врач", "Nha Trang"],
  openGraph: {
    title: "Русская карта Нячанга",
    description: "Карта полезных мест для русскоязычных в Нячанге",
    locale: "ru_RU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} h-full`}>
      <body className="h-full font-sans antialiased">{children}</body>
    </html>
  );
}
