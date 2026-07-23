import type { Metadata } from "next";
import { Geist_Mono, Space_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AgentationProvider } from "@/components/agentation-provider";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const handOfJen = localFont({
  src: "../fonts/hand-of-jen.ttf",
  variable: "--font-hand",
});

export const metadata: Metadata = {
  title: "Bay Burrito Challenge",
  description:
    "Every Bay Area burrito, eaten, ranked, and written up by hand.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistMono.variable} ${spaceMono.variable} ${handOfJen.variable} grain antialiased`}
      >
        {children}
        <AgentationProvider />
      </body>
    </html>
  );
}
