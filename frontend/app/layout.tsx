import type { Metadata } from "next";
import "./globals.css";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: {
    default: SITE.defaultTitle,
    template: `%s | ${SITE.nameEn}`,
  },
  description: SITE.defaultDescription,
  openGraph: {
    title: SITE.defaultTitle,
    description: SITE.defaultDescription,
    url: SITE.url,
    locale: "ar_MA",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
