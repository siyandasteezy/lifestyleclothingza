import type { Metadata } from "next";
import { Fraunces, Outfit, Tenor_Sans } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { site, SITE_URL } from "@/lib/site";
import "./globals.css";

// Brand faces: Outfit (body) + Tenor Sans (display),
// plus Fraunces italic as the editorial accent (eyebrows, folios, pull lines).
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const tenorSans = Tenor_Sans({
  variable: "--font-tenor",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  style: ["italic"],
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: site.metaTitle,
    template: `%s – ${site.name}`,
  },
  description: site.metaDescription,
  openGraph: {
    siteName: site.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

// Google Analytics 4. Loaded via @next/third-parties so gtag is deferred and
// route changes are tracked automatically. Set NEXT_PUBLIC_GA_ID to enable —
// left unset locally so development traffic never reaches the property.
const gaId = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${tenorSans.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </html>
  );
}
