import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { SyncBadge } from "@/components/SyncBadge";

const barlow = Barlow_Condensed({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Lean & Mean",
  description: "Personal training cockpit",
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/manifest.webmanifest`,
  icons: {
    apple: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/apple-touch-icon.png`,
  },
  appleWebApp: {
    capable: true,
    title: "Lean & Mean",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${barlow.variable} ${inter.variable} antialiased`}>
        <AuthGate>
          <div
            className="mx-auto min-h-dvh w-full max-w-md"
            style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
          >
            {children}
          </div>
          <BottomNav />
          <SyncBadge />
        </AuthGate>
      </body>
    </html>
  );
}
