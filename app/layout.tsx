import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Screentime Rewards",
  description: "Earn screen time by completing chores and activities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen text-slate-50`}
      >
        <div className="min-h-screen bg-slate-950/70 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25)_0,_transparent_45%),_radial-gradient(circle_at_bottom,_rgba(129,140,248,0.35)_0,_transparent_55%)]">
          {children}
        </div>
      </body>
    </html>
  );
}
