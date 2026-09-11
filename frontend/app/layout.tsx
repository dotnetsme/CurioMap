import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: {
    default: "CurioMap — a live map of human curiosity",
    template: "%s · CurioMap",
  },
  description:
    "A global, open-source, geolocation-based reading graph. Anonymous identities, coarse-location discovery, and short book conversations — privacy-first.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-100 antialiased">
        <AuthProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6">{children}</main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
