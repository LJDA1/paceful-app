import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paceful - Emotional Readiness Platform",
  description: "Track your emotional healing journey with science-backed insights. Get your Emotional Readiness Score and see the progress you can't always feel.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.svg",
  },
  openGraph: {
    title: "Paceful - Emotional Readiness Platform",
    description: "Track your emotional healing journey with science-backed insights. Get your Emotional Readiness Score and see the progress you can't always feel.",
    url: "https://app.paceful.com",
    siteName: "Paceful",
    images: [{ url: "/og-image.svg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Paceful - Emotional Readiness Platform",
    description: "Track your emotional healing journey with science-backed insights.",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-stone-50 min-h-screen`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
