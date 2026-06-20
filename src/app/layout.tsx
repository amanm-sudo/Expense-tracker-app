import type { Metadata } from "next";
import { Inter, DM_Serif_Display, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wealth Journal — Personal Financial Narrative",
  description:
    "A refined expense tracker that turns your spending into a story. Track expenses, manage recurring obligations, and get AI-powered insights.",
  keywords: ["expense tracker", "budget", "finance", "wealth journal", "AI insights"],
  authors: [{ name: "Wealth Journal" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${dmSerif.variable} ${cormorant.variable} antialiased bg-cream text-text-primary`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
