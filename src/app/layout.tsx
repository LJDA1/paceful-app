import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
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

const jbMono = JetBrains_Mono({
  variable: "--font-jb-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
  metadataBase: new URL("https://paceful-app.vercel.app"),
  title: "Paceful — Emotional Readiness Scoring Infrastructure",
  description: "API-first emotional readiness scoring for insurance, CX, gambling, dating, and healthcare platforms. Drop a JSON config, get a new vertical.",
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
    title: "Paceful — Emotional Readiness Scoring Infrastructure",
    description: "API-first emotional readiness scoring for insurance, CX, gambling, dating, and healthcare platforms. Drop a JSON config, get a new vertical.",
    url: "https://paceful-app.vercel.app",
    siteName: "Paceful",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Paceful — Emotional Readiness Scoring Infrastructure" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Paceful — Emotional Readiness Scoring Infrastructure",
    description: "API-first emotional readiness scoring for insurance, CX, gambling, dating, and healthcare platforms. Drop a JSON config, get a new vertical.",
    images: ["/og-image.png"],
  },
  authors: [{ name: "LJ", url: "https://linkedin.com/in/lewis-johnson-0a12a7208" }],
  creator: "LJ",
  publisher: "Paceful",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${fraunces.variable} ${jbMono.variable} font-sans antialiased min-h-screen`} style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
