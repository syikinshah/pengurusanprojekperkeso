import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LMS-ITS PERKESO | Sistem Pengurusan Pembelajaran & Penjejakan Invois",
  description:
    "Sistem bersepadu Unit Pengurusan Projek PERKESO untuk pengurusan latihan (LMS) dan penjejakan pembayaran invois projek.",
  keywords: ["PERKESO", "LMS", "Pengurusan Projek", "Invois", "Latihan"],
  authors: [{ name: "Unit Pengurusan Projek, PERKESO" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
