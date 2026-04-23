import type { Metadata } from "next";
import { Noto_Sans_JP, Space_Grotesk } from "next/font/google";

import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const bodyFont = Noto_Sans_JP({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "auto-startup local console",
  description: "DB 非依存のローカル control-plane",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-gray-950 text-gray-100">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
