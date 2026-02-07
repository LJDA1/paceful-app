import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paceful - Heal at Your Pace",
  description: "Track your emotional healing journey with science-backed insights. Get your Emotional Readiness Score and see the progress you can't always feel.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.svg",
  },
  openGraph: {
    title: "Paceful - Heal at Your Pace",
    description: "Track your emotional healing journey with science-backed insights. Get your Emotional Readiness Score and see the progress you can't always feel.",
    url: "https://app.paceful.com",
    siteName: "Paceful",
    images: [{ url: "/og-image.svg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Paceful - Heal at Your Pace",
    description: "Track your emotional healing journey with science-backed insights.",
    images: ["/og-image.svg"],
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
