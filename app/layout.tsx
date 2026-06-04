import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const axope = localFont({
  src: "../public/fonts/AXOPE.ttf",
  variable: "--font-axope-var",
  display: "swap",
});

const APP_URL = "https://tickylo.app";
const APP_NAME = "Tickylo";
const APP_DESCRIPTION = "Tickylo is a smart employee performance and task management platform. Track tickets, manage time, monitor team productivity, and generate client invoices — all in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: `${APP_NAME} — Track · Manage · Perform`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    "employee performance tracking",
    "task management",
    "ticket management",
    "time tracking",
    "team productivity",
    "client invoicing",
    "HR software",
    "project management",
    "workforce management",
    "Tickylo",
  ],
  authors: [{ name: "Tickylo", url: APP_URL }],
  creator: "Tickylo",
  publisher: "Tickylo",
  applicationName: APP_NAME,
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Favicons & icons
  icons: {
    icon: [
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon_io/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/favicon_io/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "android-chrome-192x192", url: "/favicon_io/android-chrome-192x192.png" },
      { rel: "android-chrome-512x512", url: "/favicon_io/android-chrome-512x512.png" },
    ],
  },
  manifest: "/favicon_io/site.webmanifest",

  // Open Graph — Facebook, LinkedIn, WhatsApp, general social
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — Track · Manage · Perform`,
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tickylo — Employee Performance & Task Management",
      },
    ],
    locale: "en_US",
  },

  // Twitter / X Card
  twitter: {
    card: "summary_large_image",
    site: "@tickylo",
    creator: "@tickylo",
    title: `${APP_NAME} — Track · Manage · Perform`,
    description: APP_DESCRIPTION,
    images: ["/og-image.png"],
  },

  // Canonical
  alternates: {
    canonical: APP_URL,
  },

  // App category
  category: "business",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Geo tags */}
        <meta name="geo.region" content="PH" />
        <meta name="geo.placename" content="Philippines" />
        <meta name="language" content="English" />
        {/* Theme color */}
        <meta name="theme-color" content="#0D1F14" />
        <meta name="msapplication-TileColor" content="#0D1F14" />
        <meta name="msapplication-TileImage" content="/favicon_io/android-chrome-192x192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${axope.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
