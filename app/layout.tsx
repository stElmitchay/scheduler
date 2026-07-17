import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const productionUrl = "https://kcf-schedule.vercel.app";
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : productionUrl);

const socialPreview = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Kharis Church Freetown scheduling calendar",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Kharis Church Freetown Scheduler",
  description:
    "Shared scheduling and booking calendar for Kharis Church Freetown.",
  openGraph: {
    title: "Kharis Church Freetown Scheduler",
    description:
      "Shared scheduling and booking calendar for Kharis Church Freetown.",
    siteName: "Kharis Church Freetown",
    type: "website",
    url: "/",
    images: [socialPreview],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kharis Church Freetown Scheduler",
    description:
      "Shared scheduling and booking calendar for Kharis Church Freetown.",
    images: [socialPreview],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
