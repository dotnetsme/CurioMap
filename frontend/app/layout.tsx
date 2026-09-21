import type { Metadata } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CurioMap — a live map of human curiosity",
    template: "%s · CurioMap",
  },
  description:
    "A global, open-source, geolocation-based reading graph. Anonymous identities, coarse-location discovery, and short book conversations — privacy-first.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-stage text-ink antialiased font-sans"
      >
        <AuthProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-6 sm:px-8">
            {children}
          </main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
