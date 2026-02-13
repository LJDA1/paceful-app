import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "500", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#5B8A72",
};

export const metadata: Metadata = {
  title: "Paceful - Emotional Readiness Platform",
  description: "Track your emotional healing journey with science-backed insights. Get your Emotional Readiness Score and see the progress you can't always feel.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Paceful",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
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
      <body className={`${dmSans.variable} ${fraunces.variable} font-sans antialiased min-h-screen`} style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
