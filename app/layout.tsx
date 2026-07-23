import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const handOfJen = localFont({
  src: "../fonts/hand-of-jen.ttf",
  variable: "--font-hand",
});

export const metadata: Metadata = {
  title: "Bay Area Burrito Challenge",
  description:
    "The BBC. Every Bay Area burrito, eaten, ranked, and written up by hand.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${instrument.variable} ${handOfJen.variable} grain antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
