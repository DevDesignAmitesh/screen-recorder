import type { Metadata } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/auth-context";
import { PRODUCT_NAME } from "@/lib/constants";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://screensy.amitesh.work";
const DESCRIPTION =
  "Screen recording with face cam, wallpapers, and templates — composited right in your browser, nothing ever uploaded.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: PRODUCT_NAME,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: DESCRIPTION,
  keywords: ["screen recorder", "screen recording", "webcam overlay", "face cam", "browser recorder", PRODUCT_NAME],
  openGraph: {
    title: PRODUCT_NAME,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: PRODUCT_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PRODUCT_NAME,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {/* Unused by the current no-auth flow (nothing calls setSession
            anymore now that /login and /signup are unrouted) — left in
            place, harmless, so auth is a one-line restore if it comes back. */}
        <AuthProvider>{children}</AuthProvider>

        <footer className="flex justify-center py-6">
          <a
            href="https://amitesh.work"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            built with 💖 by Amitesh
          </a>
        </footer>
      </body>
    </html>
  );
}
