import type { Metadata } from "next";
import { Outfit, Tenor_Sans } from "next/font/google";
import { site, SITE_URL } from "@/lib/site";
import "./globals.css";

// Same families as the original Shopify theme: Outfit (body) + Tenor Sans (headings).
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${tenorSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
