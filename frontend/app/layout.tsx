import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

// Fallback for platforms without SF Pro; Apple devices use the system font (see globals.css).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Applies a stored theme choice before first paint to avoid a flash of the wrong theme.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://curiomap.app"),
  title: {
    default: "CurioMap — a live map of human curiosity",
    template: "%s · CurioMap",
  },
  description:
    "A global, open-source, geolocation-based reading graph. Anonymous identities, coarse-location discovery, and short book conversations — privacy-first.",
  openGraph: {
    title: "CurioMap — a live map of human curiosity",
    description:
      "See what the world is reading right now. Privacy-first, fuzzed coordinates.",
    url: "https://curiomap.app",
    siteName: "CurioMap",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "CurioMap — a live map of human curiosity",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CurioMap — a live map of human curiosity",
    description:
      "See what the world is reading right now. Privacy-first, fuzzed coordinates.",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={inter.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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
